const express = require('express');
const { exec, execSync } = require('child_process');
const schedule = require('node-schedule');
const path = require('path');
const cron = require('node-cron');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.post('/lock', (req, res) => {
  const { appName, startTime, endTime } = req.body;
  
  // Validate input
  if (!appName ||!startTime ||!endTime) {
    return res.status(400).json({ message: 'Invalid input' });
  }

  // Convert start and end times to milliseconds
  const startMs = new Date(startTime).getTime();
  const endMs = new Date(endTime).getTime();

  let timer;

  // Check if progammes within the specified time period
  if (new Date().getTime() >= startMs && new Date().getTime() <= endMs) {
    // Create a timer that checks for the application every 1 second
    timer = setInterval(() => {
      if (isApplicationRunning(appName)) {
        // Close the application
        lockApplication(appName);
      } else {
        console.log(`Application ${appName} is not running. Doing nothing.`);
      }
    }, 1000); // Check every 1 second
  }

  // Clear the timer when the end time is reached
  setTimeout(() => {
    clearInterval(timer);
  }, endMs - new Date().getTime());

  res.json({ message: `Application ${appName} will be locked from ${startTime} to ${endTime}` });
});

let tasks = {};

function isApplicationRunning(appName) {
  //check if the application is running
  const taskList = execSync('tasklist', { encoding: 'utf8' }).trim().split('\n');
  for (const line of taskList) {
    if (line.includes(appName)) {
      return true;
    }
  }
  return false;
}

function lockApplication(appName) {
  // Get the PID of the application process
  exec(`tasklist | findstr ${appName}`, (err, stdout, stderr) => {
    if (err) {
      console.error(`Error locking application ${appName}:`, err);
      console.error(stderr);
      console.error(`Is the application name correct? Is the application running?`);
    } else {
      const pid = stdout.match(/(\d+)/)[0];
      if (pid) {
        // Use taskkill to kill the process by PID
        exec(`taskkill /PID ${pid} /F`, (err, stdout, stderr) => {
          if (err) {
            console.error(`Error locking application ${appName}:`, err);
            console.error(stderr);
          } else {
            console.log(`Application ${appName} locked.`);
          }
        });
      } else {
        console.error(`Unable to find PID of ${appName}`);
      }
    }
  });
}

function unlockApplication(appName) {
  console.log(`Application ${appName} should be unlocked now.`);
}

app.listen(port, () => {
  console.log(`Backend service listening at http://localhost:${port}`);
  console.log(`Make sure to run this script as an administrator to allow taskkill to work correctly.`);
});