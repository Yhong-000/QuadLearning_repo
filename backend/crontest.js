import cron from 'node-cron';
import moment from 'moment';

console.log("Before scheduling cron job...");

cron.schedule('* * * * *', async () => {
    console.log("Cron job triggered");
});

console.log("Cron job scheduled...");
setInterval(() => {}, 1000); // Keeps the process alive