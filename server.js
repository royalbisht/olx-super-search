import express from "express";
import cors from "cors";

const app = express();

app.use(cors());

app.get("/search", async (req, res) => {

  try {

    const query =
      req.query.q || "";

    const url =

      `https://www.olx.in/api/relevance/v4/search?query=${encodeURIComponent(query)}&size=40`;

    console.log("Fetching:", url);

    const response =
      await fetch(url, {

        headers: {

          "User-Agent":
            "Mozilla/5.0",

          "Accept":
            "application/json",

          "Origin":
            "https://www.olx.in",

          "Referer":
            "https://www.olx.in/"

        }

      });

    const text =
      await response.text();

    console.log(
      "RAW RESPONSE:",
      text.slice(0, 500)
    );

    res.setHeader(
      "Content-Type",
      "application/json"
    );

    res.send(text);

  }
  catch (err) {

    console.error("SERVER ERROR:", err);

    res.status(500).json({

      error:
        err.message ||

        "Server failed"

    });

  }

});

const PORT =
  process.env.PORT || 3001;

app.listen(PORT, () => {

  console.log(
    `Server running on ${PORT}`
  );

});