const puppeteer = require('puppeteer');
const fs = require('fs')

/* 
    List the faculty codes to be scraped here. 
    Note that the scraper will throw an error if there is no course for a particular code, 
    so you should either 1) check beforehand which faculties do not have courses open or 
    2) just put in all the codes and see when the program stops
*/
const allFacCodes = [] 

/* 
    List the place where you want to save the data
*/
const datasetDir = 'data'

function sleep(time) {
    // return a Promise that mimics other programming languages' sleep()
    return new Promise((resolve) => setTimeout(resolve, time))
}

function parseTime(s) {
    // for parsing the time string from the table
    if(s.indexOf('TDF') >= 0) { 
        return 'TDF';
    }
    r = /^([0-9]{1,2}) (.+) ([0-9]{4}) เวลา ([0-9\:]{4,5})\-([0-9\:]{4,5}) น\.$/
    m = s.match(r)
    day = parseInt(m[1], 10)
    month = m[2]
    year = parseInt(m[3], 10) - 543
    timeStart = m[4]
    timeEnd = m[5]
    return [[day, month, year].join(' '), timeStart, timeEnd]
}

(async(allFacCodes, datasetDir) => {
   
// The following function is an unused function for making several requests until the desired selector appears
// See line 87 for example usage
// 
// async function selector_exist(frame, selector, callback) {
//     try {
//         await frame.waitForSelector(selector, { timeout: 1000 })
//         return await frame.$$(selector)
//     } catch (error) { 
//         console.log(error)
//         await callback() 
//         selector_exist(frame, selector, callback)
//     }
// }

const browser = await puppeteer.launch({
    headless: true
})
const page = await browser.newPage()
await page.setViewport({
    width: 1200,
    height: 700,
    deviceScaleFactor: 1
})
await page.goto('https://cas.reg.chula.ac.th/cu/cs/QueryCourseScheduleNew/index.html', {
    waitUntil: "load"
})

const cs_search = page.frames().find(frame => frame.name() === 'cs_search')
const cs_left = page.frames().find(frame => frame.name() === 'cs_left')
const cs_right = page.frames().find(frame => frame.name() === 'cs_right')
const courseNo = await cs_search.$('input#courseno')

for(let i in allFacCodes) {
_facCode = ('00' + allFacCodes[i]).slice(-2)
console.log('Faculty: '+ _facCode)

await Promise.all([
    cs_search.select('select#studyProgram', 'S'),
    cs_search.select('select#semester', '2'),
    cs_search.focus('input#courseno')
])

do {
    var courseNoLen = await cs_search.evaluate((e) => e.value.length, courseNo)
    await page.keyboard.press('Backspace')
} while(courseNoLen > 0)

await cs_search.type('input#courseno', _facCode, { 'delay': 3 })
page.keyboard.press('Enter')

await cs_left.waitForNavigation({ waitUntil: 'load' })

const courseLinksH = await cs_left.$$('#Table4 tr a[target="cs_right"]')
// await selector_exist(cs_left, '#Table4 tr a[target="cs_right"]', async function() {
//     await sleep(1000)
//     await cs_search.focus('input#courseno')
//     await page.keyboard.press('Enter')
// })

for(let i = 0; i < courseLinksH.length; i++) {
    console.log(i)
    await courseLinksH[i].click()
    await cs_right.waitForNavigation({ waitUntil: 'load' })

    let course

    console.log('Getting rowsHandle...')
    await cs_right.waitForSelector('#Table3 tr')
    const rowsHandle = await cs_right.$$('#Table3 tr')
    
    let schedule = {}
    let section = 1
    
    console.log('Lopping through rows...')
    for(let i = 2; i < rowsHandle.length; i++) {
        let row = {}
        console.log('Getting row ' + i)
        const r = await rowsHandle[i].$$eval('td', function(tds, section) {
            let o = 1 
            if(tds[0].colSpan == 2) {
                o = 0
            } else {
                section = parseInt(tds[1].textContent.trim(), 10)
            }

            return [{
                'method': tds[o+1].textContent.trim(),
                'day': tds[o+2].textContent.replace(/[\n\t\s]+/g, ' ').trim(),
                'period': tds[o+3].textContent.trim(),
                'building': tds[o+4].textContent.trim(),
                'room': tds[o+5].textContent.trim(),
                'instructor': tds[o+6].textContent.trim(),
                'note': tds[o+7].textContent.replace(/[\n\t\s]+/g, ' ').trim()
            }, section]
        }, section)

        row = r[0]
        section = r[1]

        if(!(section in schedule)) {
            schedule[section] = [row]
        } else {
            schedule[section].push(row)
        }
    }

    console.log('Getting metadata...')
    const metadata = await cs_right.$$eval('form[name="courseScheduleDtlForm"] tr font', async function(fonts) {
        return {
            'thName': fonts[4].textContent.trim(),
            'code': fonts[2].textContent.trim(), 
            'abbr': fonts[3].textContent.trim(),
            'enName': fonts[5].textContent.trim(),
            'fac': fonts[6].textContent.replace(/\(.+\)/g, '').trim(),
            'dept': fonts[6].textContent.replace(/[^\(\)]*\((.+)\)/g, '$1').trim(),
            'credit': parseInt(fonts[7].textContent.trim(), 10),
            'cHrs1': fonts[9].textContent.replace(/[\n\t]+/g, ' ').trim(),
            'cHrs2': fonts[10].textContent.replace(/[\(\)]/g, '').replace(/[\n\t]+/g, ' ').trim(),
            'prereq': (fonts[12].textContent == '-') ? null : fonts[12].textContent.trim(),
            'midtermDate': fonts[14].textContent.trim(),
            'finalDate': fonts[16].textContent.trim()
        }
    }).then(function(metadata) {
        metadata['midtermDate'] = parseTime(metadata['midtermDate'])
        metadata['finalDate'] = parseTime(metadata['finalDate'])
        return metadata
    })

    course = metadata    
    course['schedule'] = schedule

    const facCode = course['code'].toString().slice(0, 2)
    const dataDir = [datasetDir, facCode].join('/')

    if(!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir)
    }
    
    fs.writeFileSync([dataDir, course['code'] + '.json'].join('/'), JSON.stringify(course), (err) => {
        if (err) throw err
    })

}

console.log('TOTAL: ' + courseLinksH.length)

await sleep(5000)

}

process.exit(1)

})(allFacCodes, datasetDir);