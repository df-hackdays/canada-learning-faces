const express = require('express');
const bodyParser = require('body-parser');
const Schema = require('./schema');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

const config3 = {
  headers: {
    app_id: 'f2d8b47f',
    app_key: 'c07250b16f903181a72200eccc26fbd1',
    'Content-Type': 'application/json'
  }
};

function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

const getKeyWithMaxValue = data => {
  const max = Math.max(...Object.values(data));
  return getKeyByValue(data, max);
};

const ethnicityDetect = data => {
  const newData = { asian: data.asian, black: data.black, hispanic: data.hispanic, white: data.white };
  return getKeyWithMaxValue(newData);
};

app.use(bodyParser.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  next();
});

// RESTful Routes
// avgAge: attributes.age, gender: attributes.gender
// Face management
app.get('/api/faces', (req, res) => {
  Schema.find({}, (err, prod) => {
    // console.log(prod);
    res.json(prod);
  });
});
app.post('/api/faces', (req, res) => {
  Schema.findOne({ id: req.body.id }, (err, prod) => {
    const body = req.body;
    const attributes = body.face.faceAttributes;
    console.log(err, prod);
    if (prod) {
      // Face exists

      prod.set('avgAge', (prod.avgAge * prod.count + attributes.age) / (prod.count + 1));
      prod.set('count', prod.count + 1);
      if (prod.gender === 'N/A') {
        prod.set('gender', attributes.gender);
      } else if (prod.gender !== attributes.gender) {
        prod.set('gender', 'N/A');
      }
      prod.save();
      res.send(prod.toObject());

      // new Schema({id: req.body.id}).save((err, prod) => {
      //   if (err) {
      //     console.error(err);
      //     res.sendStatus(500);
      //   } else {
      //     const face = prod.toObject();
      //     res.send(face);
      //   }
      // });
    } else {
      // face does not exist;

      // const img = Buffer.from(req.body.img.split(';base64,').pop(),'base64');
      // sharp(img)
      //   .extract(req.body.face.faceRectangle)
      //   .toBuffer()
      //   .then(data => {
      //     console.log(`data:image/png;base64,${data.toString('base64')}`);
      //   })
      const rec = body.face.faceRectangle;
      axios.post('https://api.kairos.com/detect', { image: body.img }, config3)
        .then(r => {
          r.data.images[0].faces.forEach(face => {
            const centerX = face.topLeftX + (face.width / 2);
            const centerY = face.topLeftY + (face.height / 2);
            if (centerX > rec.left && centerX < rec.left + rec.width && centerY > rec.top && centerY < rec.top + rec.height) {
              console.log(face);
              const e = ethnicityDetect(face.attributes);
              console.log(e);
              if (e) {
                Schema.findOne({ id: req.body.id }, (er, p) => {
                  if (!p) {
                    new Schema({
                      id: body.id,
                      avgAge: attributes.age,
                      gender: attributes.gender,
                      count: 1,
                      ethnicity: e,
                      firstSeen: Date.now()
                    }).save((err, prod) => {
                      if (err) {
                        console.error(err);
                        res.sendStatus(500);
                      } else {
                        res.send(prod.toObject());
                      }
                    });
                  }
                });
              } else {
                // res.send();
              }
            }
            // res.send();
          });
          // const e = ethnicityDetect(res.data.images[0].faces.attributes)
        });
    }
  });
});

app.get('/api/faces/:id', (req, res) => {
  Schema.findOne({ id: req.params.id }, (err, prod) => {
    if (err) {
      console.error(err);
      res.sendStatus(500);
    } else {
      if (prod) {
        res.send(prod.toObject());
      } else {
        res.send({ error: 'FACE_ID_NOT_FOUND' });
      }
    }
  });
});

app.get('/api/reset', (req, res) => {
  axios.delete('https://eastus.api.cognitive.microsoft.com/face/v1.0/facelists/test', { headers: { 'Ocp-Apim-Subscription-Key': '973045211bfd47df8bda0187fc8bae59' } })
    .then(r1 => {
      axios.put('https://eastus.api.cognitive.microsoft.com/face/v1.0/facelists/test', {
        'name': 'sample_list',
        'userData': 'User-provided data attached to the face list.'
      }, {
        headers: {
          'Ocp-Apim-Subscription-Key': '973045211bfd47df8bda0187fc8bae59',
          'Content-Type': 'application/json'
        }
      })
        .then(r2 => {
          axios.post('https://eastus.api.cognitive.microsoft.com/face/v1.0/facelists/test/persistedFaces', {
            'url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Steve_Jobs_Headshot_2010-CROP2.jpg/220px-Steve_Jobs_Headshot_2010-CROP2.jpg'
          }, {
            headers: {
              'Ocp-Apim-Subscription-Key': '973045211bfd47df8bda0187fc8bae59',
              'Content-Type': 'application/json'
            }
          }).then(r3 => {
            Schema.remove({}, (err, prod) => {
              res.send(r3.data);
            });
          });
        });
    }
    );
});

// // Login
// app.post("/login", (req, res) => {
//   console.log(`Logging in user ${req.body.username}`);
//   Schema.findOne({ username: req.body.username }, (err, prod) => {
//     if (err) {
//       console.error(err);
//       res.sendStatus(500);
//     } else {
//       if (!prod) {
//         console.error("User does not exist!");
//         res.sendStatus(403);
//       } else if (bcrypt.compareSync(req.body.password, prod.password)) {
//         console.log("Correct password!");
//         prod.set("sessionToken", crypto.randomBytes(32).toString("hex"));
//         prod.save();
//
//         const userData = prod.toObject();
//         delete userData.password;
//         res.send(userData);
//       } else {
//         console.error("Wrong password!");
//         res.sendStatus(401);
//       }
//     }
//   });
// });
//
// // Get user info
// app.get("/user/:_id/:sessionToken", (req, res) => {
//   console.log(`Check if user ${req.params} is logged in`);
//   console.log(req.params);
//   if (!req.params.sessionToken) {
//     console.log("User not logged in");
//     res.sendStatus(401);
//   } else {
//     Schema.findOne(req.params, (err, prod) => {
//       console.log(err, prod);
//       if (err) {
//         console.error(err);
//         res.sendStatus(500);
//       } else if (prod === null) {
//         console.log("User not logged in");
//         res.sendStatus(401);
//       } else {
//         const userData = prod.toObject();
//         delete userData.password;
//         delete userData._id;
//         delete userData.sessionToken;
//
//         res.send(userData);
//       }
//     });
//   }
// });
//
// // Logout
// app.post("/logout", (req, res) => {
//   Schema.findOne(req.body, (err, prod) => {
//     if (err) {
//       console.error(err);
//       res.sendStatus(500);
//     } else if (prod === null) {
//       res.sendStatus(202);
//     } else {
//       prod.set("sessionToken", null);
//       prod.save();
//       res.sendStatus(200);
//     }
//   });
// });
//
// // Currency/Transaction
// // Get current wallet/balance
// app.post("/wallet", (req, res) => {
//   Schema.findOne(req.body, (err, prod) => {
//     if (err) {
//       console.error(err);
//       res.sendStatus(500);
//     } else if (prod === null) {
//       res.sendStatus(403);
//     } else {
//       res.send(prod.wallet);
//     }
//   });
// });
// // Create a new transaction
// app.post("/transaction", (req, res) => {
//   Schema.findOne(req.body.credentials, (err, prod) => {
//     if (err) {
//       console.error(err);
//       res.sendStatus(500);
//     } else if (prod === null) {
//       res.sendStatus(403);
//     } else {
//       request.post(
//         {
//           url: `https://min-api.cryptocompare.com/data/price?fsym=${
//             req.body.symbol
//             }&tsyms=USD`,
//           json: true
//         },
//         (err, response, body) => {
//           if (req.body.amount === "MAX") {
//             req.body.amount = prod.wallet.USD / body.USD;
//           }
//           let USDAmount = prod.wallet.USD - body.USD * req.body.amount;
//           let symbolAmount = prod.wallet[req.body.symbol] + req.body.amount;
//           if (USDAmount >= 0 && symbolAmount >= 0) {
//             prod.wallet.USD = USDAmount;
//             prod.wallet[req.body.symbol] = symbolAmount;
//             prod.transactions.push({
//               currency: req.body.symbol,
//               timestamp: Date.now(),
//               amount: req.body.amount,
//               unitPrice: body.USD
//             });
//             prod.save();
//             res.send({
//               wallet: prod.wallet,
//               amount: Math.abs(req.body.amount)
//             });
//           } else {
//             res.sendStatus(409);
//           }
//         }
//       );
//     }
//   });
// });

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
