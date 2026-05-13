import express from "express";
import cors from "cors";
import axios from "axios";

const app = express();

app.use(cors());

app.get("/search", async (req, res) => {

  try {

    const query =
      req.query.q || "";

    const url =

      `https://www.olx.in/api/relevance/v4/search?query=${encodeURIComponent(query)}&size=200`;

    console.log(
      "Fetching:",
      url
    );

    const response =
      await axios.get(url, {

        timeout: 15000,

        headers: {

          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",

          "Accept":
            "application/json",

          "Origin":
            "https://www.olx.in",

          "Referer":
            "https://www.olx.in/"

        }

      });

    console.log(
      "SUCCESS:",
      response.data?.data?.length
    );

    res.json(
      response.data
    );

  }
  catch (err) {

    console.error(
      "SERVER ERROR:",
      err.message
    );

    res.status(500).json({

      error:
        err.message ||

        "Server failed"

    });

  }

});

app.get("/", (req, res) => {

  res.send(
    "OLX Super Search Backend Running"
  );

});

const PORT =
  process.env.PORT || 3001;

app.listen(PORT, () => {

  console.log(
    `Server running on ${PORT}`
  );

});