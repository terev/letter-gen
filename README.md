# Letter Gen
This project requires Node.js >= 6.x

## Install
Use your favourite choice of package manager npm or yarn
### npm
Install required packages with the command `npm install`
### Yarn
Install required packages with the command `yarn`

## Configuration
config.json
1. Set your Recruit Guelph credentials in the 'username' and 'password' fields
2. Configure the other fields accordingly

## Scraping
Running `node get-shortlist.js` will scrape your shortlist from recruit guelph and store the results locally in
shortlist.json.

## Generating Letters
The only supported output type is pdf currently.

The default letter template is called `letter-template`.
### PDF
Running `node generate-pdfs.js` will generate PDFs for each job in the stored shortlist.