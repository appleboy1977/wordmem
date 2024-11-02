Build a modern web application for  words memorization using ebinhauss curve algorithm:

Support multiple users and user need to login to use the application. with a initial admin/admin user for testing

Backend:
0. Using node.js and express framework, init the sqlite with some mimic fake data to run the  whole application with full function.
1. Extract a word list from a sqlite table using ebinhauss curve algorithm by current date and a specified number of each day.
2. The word table should contains these fields: wid: word id, word: word, pron : pronounciation, pos:Part of speech,  explain:explaination 
3. The study record should include wid, user, ldate: last study datetime, level: familiar level 0-10

Frontend:
1. List each word on each row and meaning hidden initially and when the user click it then show/hide its meaning; and allow user to click a rating button on the right side to mark the word as familiar level from 0-10.
2. make the list scroll pages using hot loading
3. using react / vite and tailwindcss / daisyui. 

