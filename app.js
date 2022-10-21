const express = require("express");
const app = express();
const cors = require("cors");

app.use(
	cors({
	  origin: "http://localhost:3000",
	})
);

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.text());

module.exports = app;