const express = require("express");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const { Edupage } = require("edupage-api");

const app = express();

// Set up CORS
app.use(cors({
    origin: 'https://richard-dot42.github.io/mapagjgt/', // Replace with your web app’s domain
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization'
}));

// Rate limiting middleware
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 requests per windowMs
    keyGenerator: function (req /*, res*/) {
        return req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    },
    message: "Too many requests from this IP, please try again later"
});
app.use(limiter);

app.get("/", async (req, res) => {
    const { username, password } = req.query;

    // Check if username and password are provided
    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
    }

    try {
        // Authenticate with Edupage API
        const edupage = new Edupage();
        await edupage.login(username, password);

        // Get today's date
        const today = new Date();

        // Get timetable for today
        const timetable = await edupage.getTimetableForDate(today);

        // Find the next classroom
        let nextClassroom = null;
        for (const lesson of timetable.lessons) {
            const currentTime = new Date();
            const lessonStartTime = new Date(lesson.date);
            if (lessonStartTime > currentTime) {
                nextClassroom = lesson.classrooms[0].name; // Assuming only one classroom per lesson
                break;
            }
        }

        // Return next classroom
        if (nextClassroom) {
            res.status(200).json({ nextClassroom });
        } else {
            res.status(404).json({ error: "No upcoming lessons found" });
        }
    } catch (error) {
        // Handle authentication errors
        if (error.message === "Invalid login") {
            res.status(401).json({ error: "Invalid username or password" });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
