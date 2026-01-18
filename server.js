const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const adminRoutes = require("./routes/admin");


const maintenanceMiddleware = require("./middleware/miantenanceMiddleware");

require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.use(maintenanceMiddleware);

app.use(express.static("public"));


app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/books", require("./routes/books"));

app.get("/", (req, res) => {
    res.send("Backend çalışıyor kralım 👑");
});

const startServer = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB bağlandı");

        app.listen(5000, () => {
            console.log("Server 5000 portunda çalışıyor");
        });
    } catch (err) {
        console.error("MongoDB bağlantı hatası:", err.message);
    }
};

startServer();
