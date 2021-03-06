# CU course schedules (academic semester 2/2019)
This repository contains course schedule data for semester 2/2019 for two-semester programs from the publicly available website of Office of Registrar, Chulalongkorn University. 

## Last scraped
The data were scraped on 19 October 2019, 00.23 a.m. They may not be up-to-date. 

## Data
The course data are scraped using [Puppeteer](https://github.com/GoogleChrome/puppeteer/). They are classified based on the faculties they are taught in, from 01, the Sirindhorn Thai Institute, to 99 Other Universities and stored in subdirectories of the `data` directory, whose names are faculty numbers. At the time of scraping 56 (School of Integrated Innovation) and 58 (Sasin Business School) do not have any course available, so there are no corresponding subdirectories.

### Structure of the JSON
Data are stored separately for each course in JSON format with the name `${course number}.json`. The structure of the JSON is as follows:

```
{
  "thName": Course name in Thai,
  "enName": Course name in English,
  "code": Course number,
  "abbr": Course name abbreviation,
  "fac": Faculty name,
  "dept": Department/Section name,
  "credit": Credit (integer),
  "cHrs1": Detailed breakdown of the credit (1st line),
  "cHrs2": Detailed breakdown of the credit (2nd line),
  "prereq": Prerequisites and conditions for the course,
  "midtermDate": Date of the midterm exam in the format [Date in Thai (C.E.), Start time, End time] , or "TDF" (To be declared by faculty),
  "finalDate": Date of the final exam , or "TDF" (To be declared by faculty),
  "schedule": Schedule data
}
```
Schedule data have the following format:

```
{
  Section number: [{
    "method": Teaching method for that section,
    "day": Day of the week in which the period takes place,
    "period": Start and end time of each period,
    "building": Building,
    "room": Room,
    "instructor": Instructor abbreviated name,
    "note": Note, usually indicating student body exclusiveness and gen-ed status of the course
  }, ...],
  ...
}
```

## Scraping 
To do the scraping yourself, simple configure `scrape.js` by setting the faculty numbers you want to scrape (`allFacCodes`), and set the directory for saving the data (`datasetDir`).

Then, run Node

```bash
npm install
node scrape.js
```
Kindly send me a pull request if you have scraped a more recent version of the schedule, or if you find a problem with the script.
