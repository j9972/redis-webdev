const express = require("express");
const axios = require("axios");
const cors = require("cors");
const Redis = require("redis");

// ({ url: default url })
const redisClient = Redis.createClient();
const DEFAULT_EXPIRATION = 3600; // 3600s == 1hr

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.get("/photos", async (req, res) => {
  const albumId = req.query.albumId;
  const photos = await getOrSetCache(`photos?albumId=${albumId}`, async () => {
    const { data } = await axios.get(
      "https://jsonplaceholder.typicode.com/photos",
      {
        params: {
          albumId,
        },
      }
    );
    return data;
  });

  res.json(photos);
  // redisClient.get(`photos?albumId=${albumId}`, async (error, photos) => {
  //   if (error) console.log(error);
  //   if (photos != null) {
  //     console.log("cache hit");
  //     return res.json(JSON.parse(photos));
  //   } else {
  //     console.log("cache miss");
  //     const { data } = await axios.get(
  //       "https://jsonplaceholder.typicode.com/photos",
  //       {
  //         params: {
  //           albumId,
  //         },
  //       }
  //     );
  //     redisClient.setex(
  //       // 'photos'
  //       `photos?albumId=${albumId}`,
  //       DEFAULT_EXPIRATION,
  //       JSON.stringify(data)
  //     );
  //   }
  //   res.json(data);
  // });
});

app.get("/photos/:id", async (req, res) => {
  const photo = await getOrSetCache(`photos:${req.params.id}`, async () => {
    const { data } = await axios.get(
      `https://jsonplaceholder.typicode.com/photos/${req.params.id}`
    );
    return data;
  });

  res.json(photo);
});

const getOrSetCache = (key, cb) => {
  return new Promise((resolve, reject) => {
    redisClient.get(key, async (error, data) => {
      if (error) return reject(error);
      if (data != null) return resolve(JSON.parse(data));
      const freshData = await cb();
      redisClient.setEx(key, DEFAULT_EXPIRATION, JSON.stringify(freshData));
      resolve(freshData);
    });
  });
};

app.listen(6000);
