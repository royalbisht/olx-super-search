import express from "express";
import cors from "cors";

const app = express();

app.use(cors());

app.get("/search", async (req, res) => {

  const query =
    req.query.q || "";

  try {

    const url =

      `https://api.olx.in/relevance/v4/search?` +

      `query=${encodeURIComponent(query)}` +

      `&size=200` +

      `&platform=web-desktop` +

      `&lang=en-IN`;



    console.log(url);

    const response =
      await fetch(url, {

        headers: {

          "User-Agent":
            "Mozilla/5.0",

          "Accept":
            "application/json"

        }

      });

    const data =
      await response.json();

    res.json(data);

  }
  catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Failed"
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