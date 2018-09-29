import React, { Component } from 'react';
import axios from 'axios';
import './index.css';
import Webcam from 'react-webcam';

import Chart from 'chart.js';
import M from 'materialize-css';

// const config = {
//   baseURL: 'https://westcentralus.api.cognitive.microsoft.com/face/v1.0',
//   headers: {
//     'Ocp-Apim-Subscription-Key': 'b459b3b7b78e491f83cbb3d4fa43585e',
//     'Content-Type': 'application/octet-stream'
//   }
// };
//
// const config2 = {
//   baseURL: 'https://westcentralus.api.cognitive.microsoft.com/face/v1.0',
//   headers: {
//     'Ocp-Apim-Subscription-Key': 'b459b3b7b78e491f83cbb3d4fa43585e',
//     'Content-Type': 'application/json'
//   }
// };
const genConfig = (key, json = true) => {
  return {
    baseURL: 'https://eastus.api.cognitive.microsoft.com/face/v1.0',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': json ? 'application/json' : 'application/octet-stream'
    }
  };
};

// const config3 = {
//   headers: {
//     app_id: 'f2d8b47f',
//     app_key: 'c07250b16f903181a72200eccc26fbd1',
//     'Content-Type': 'application/json'
//   }
// };

function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

// const genderDetect = gender => {
//   if (gender.type === 'M') { return 'Male'; }
//   if (gender.type === 'F') { return 'Female'; }
// };

const getKeyWithMaxValue = data => {
  const max = Math.max(...Object.values(data));
  return getKeyByValue(data, max);
};

// const ethnicityDetect = data => {
//   const newData = { asian: data.asian, black: data.black, hispanic: data.hispanic, white: data.white };
//   return getKeyWithMaxValue(newData);
// };

const b64ToOctet = (imageSrc) => {
  var block = imageSrc.split(';');
  // get the real base64 content of the file
  var b64Data = block[1].split(',')[1];

  const contentType = '';
  const sliceSize = 512;

  var byteCharacters = atob(b64Data);
  var byteArrays = [];

  for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    var slice = byteCharacters.slice(offset, offset + sliceSize);

    var byteNumbers = new Array(slice.length);
    for (var i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    var byteArray = new Uint8Array(byteNumbers);

    byteArrays.push(byteArray);
  }

  var blob = new Blob(byteArrays, { type: contentType });
  return blob;
};

const myArray = [
  // 'f1711373c0954048a7a38fd93fae576d',
  // 'd932db50e00344ee8eb49e9077eb4293',

  // '64596df67a534da8bf90526ea75ed126',
  // 'b459b3b7b78e491f83cbb3d4fa43585e',
  //
  // 'd5558af0a57848b3a4d5ee75766383ae',
  // '139abb23cd04411499378600619cb287',
  //
  // '4277f54f97dc4644aa540e94af7a2235',
  // 'e659f15698164cc78bfcab8fa68ee95b'
  'bb94c7ae34014db5827fc4c87557a7c6',
  '973045211bfd47df8bda0187fc8bae59'

];

class WebcamCapture extends React.Component {
  setRef = webcam => {
    this.webcam = webcam;
  };

  state = { age: null, ethnicity: null, gender: null, id: null, emotion: null };
  componentDidMount() {
    setInterval(this.detect, 800);
  }


  reset = () => {
    axios.get('/api/reset')
      .then(res => { console.log(res.data); });
  }


  detect = () => {
    try {
      const imageSrc = this.webcam.getScreenshot();
      const octet = b64ToOctet(imageSrc);
      const key = myArray[0];
      axios.post('/detect?returnFaceId=true&returnFaceLandmarks=false&returnFaceAttributes=age,gender,emotion', octet, genConfig(key, false))
        .then(res => {
          res.data.forEach((face) => {
            const attributes = face.faceAttributes;
            // console.log(data);
            this.setState({
              emotion: getKeyWithMaxValue(attributes.emotion)
            });
            axios.post('/findsimilars', {
              'faceId': face.faceId,
              'faceListId': 'test',
              'maxNumOfCandidatesReturned': 1,
              'mode': 'matchPerson'
            }, genConfig(key))
              .then(res => {
                if (res.data.length === 0) {
                  // NEW FACE
                  const { left, top, width, height } = face.faceRectangle;
                  axios.post(`/facelists/test/persistedFaces?targetFace=${left},${top},${width},${height}`, octet, genConfig(key, false))
                    .then(res => {
                      this.setState({ id: `new user - ${res.data.persistedFaceId}` });
                      console.log(attributes);
                      console.log(`new user - ${res.data.persistedFaceId}`);
                      axios.post('/api/faces', { id: res.data.persistedFaceId, face: face, img: imageSrc, emotion: getKeyWithMaxValue(attributes.emotion) }, { json: true })
                        .then(res => {
                          console.log(res.data);
                          this.setState({ ethnicity: res.data.ethnicity,
                            age: res.data.avgAge,
                            gender: res.data.gender });
                        });
                      // axios.post('https://api.kairos.com/detect', { image: imageSrc }, config3)
                      //   .then(res => {
                      //     const e = ethnicityDetect(res.data.images[0].faces[0].attributes);
                      //     this.setState({ ethnicity: e });
                      //   });
                    });
                } else {
                  // KNOWN FACE
                  this.setState({ id: `known user - ${res.data[0].persistedFaceId}` });
                  console.log(attributes);
                  console.log(`known user - ${res.data[0].persistedFaceId}`);
                  axios.get(`/api/faces/${res.data[0].persistedFaceId}`)
                    .then(r => {
                      const payload = { id: res.data[0].persistedFaceId, face: face, emotion: getKeyWithMaxValue(attributes.emotion)};
                      if (r.data.error) {
                        payload.img = imageSrc;
                      }
                      axios.post('/api/faces', payload, { json: true })
                        .then(res => {
                          console.log(res.data);
                          this.setState({ ethnicity: res.data.ethnicity,
                            age: res.data.avgAge,
                            gender: res.data.gender });
                        });
                    });

                  // axios.post('https://api.kairos.com/detect', {image: imageSrc}, config3)
                  //   .then(res => {
                  //     const e = ethnicityDetect(res.data.images[0].faces[0].attributes)
                  //     this.setState({ethnicity: e})
                  //   })
                }
              });
          });
        });
    } catch (e) {

    }
  };

  render() {
    const videoConstraints = {
      width: 1280,
      height: 720,
      facingMode: 'environment'
    };

    return (
      <div>
        <Webcam
          audio={false}
          ref={this.setRef}
          screenshotFormat="image/jpeg"
          videoConstraints={videoConstraints}
        />
        <h3>Age: {Math.round(this.state.age)}</h3>
        <h3>Gender: {this.state.gender}</h3>
        <h3>ID: {this.state.id}</h3>
        <h3>Emotion: {this.state.emotion}</h3>
        <h3>Ethnicity: {this.state.ethnicity}</h3>
        <a className="waves-effect waves-light btn" style={{ marginLeft: '50px' }} onClick={this.reset}>RESET</a>
      </div>
    );
  }
}

const color = { 'red': 'rgb(255, 99, 132)', 'orange': 'rgb(255, 159, 64)', 'yellow': 'rgb(255, 205, 86)', 'green': 'rgb(75, 192, 192)', 'blue': 'rgb(54, 162, 235)', 'purple': 'rgb(153, 102, 255)', 'grey': 'rgb(201, 203, 207)' };
class Dashboard extends Component {
  state = { lastUpdate: Date.now() };

  componentDidMount() {
    const genderData = {
      datasets: [ {
        data: [
          0, 0
        ],
        backgroundColor: [
          color.red, color.blue
        ],
        label: 'Gender'
      } ],
      labels: [
        'Male', 'Female'
      ]
    };
    const ethnicityData = {
      datasets: [ {
        data: [
          0, 0, 0, 0, 0
        ],
        backgroundColor: [
          color.red, color.yellow, color.green, color.blue
        ],
        label: 'Gender'
      } ],
      labels: [
        'Asian', 'Black', 'Hispanic', 'White'
      ]
    };

    const emotionData = {
      datasets: [ {
        data: [
          0, 0, 0
        ],
        backgroundColor: [
          color.red, color.yellow, color.blue
        ],
        label: 'Gender'
      } ],
      labels: [
        'Happy', 'Neutral', 'Sad'
      ]
    };
    const ageData = {
      datasets: [ {
        data: [
          0, 0, 0, 0, 0
        ],
        backgroundColor: [
          color.red, color.yellow, color.green, color.blue, color.purple
        ],
        label: 'Gender'
      } ],
      labels: [
        '<18', '18 - 25', '26 - 35', '36 - 50', '>50'
      ]
    };
    let graphGender = document.getElementById('graphGender');
    this.graphGender = new Chart(graphGender, {
      type: 'pie',
      data: genderData,
      options: {
        title: {
          display: true,
          text: 'Gender',
          fontColor: '#ddd',
          fontStyle: 500,
          fontSize: 30
        },
        legend: {
          labels: {
            fontColor: '#ddd'
          }
        },
        responsive: true
      }
    });
    let graphAge = document.getElementById('graphAge');
    this.graphAge = new Chart(graphAge, {
      type: 'pie',
      data: ageData,
      options: {
        title: {
          display: true,
          text: 'Age',
          fontColor: '#ddd',
          fontStyle: 500,
          fontSize: 30
        },
        legend: {
          labels: {
            fontColor: '#ddd'
          }
        },
        responsive: true
      }
    });
    let graphEthnicity = document.getElementById('graphEthnicity');
    this.graphEthnicity = new Chart(graphEthnicity, {
      type: 'pie',
      data: ethnicityData,
      options: {
        title: {
          display: true,
          text: 'Ethnicity',
          fontColor: '#ddd',
          fontStyle: 500,
          fontSize: 30
        },
        legend: {
          labels: {
            fontColor: '#ddd'
          }
        },
        responsive: true
      }
    });

    let graphEmotion = document.getElementById('graphEmotion');
    this.graphEmotion = new Chart(graphEthnicity, {
      type: 'pie',
      data: emotionData,
      options: {
        title: {
          display: true,
          text: 'Emotion',
          fontColor: '#ddd',
          fontStyle: 500,
          fontSize: 30
        },
        legend: {
          labels: {
            fontColor: '#ddd'
          }
        },
        responsive: true
      }
    });
    this.updateData();
    setInterval(() => {
      this.updateData();
    }, 500);
  }

  updateData() {
    axios.get('/api/faces')
      .then(res => {
        const faces = res.data;
        let male = 0; let female = 0;
        let asian = 0; let black = 0; let hispanic = 0; let white = 0;
        let ages = [ 0, 0, 0, 0 ];
        let happy =0; let sad = 0; let neutral = 0;
        faces.forEach(face => {
          if (new Date(face.firstSeen) > this.state.lastUpdate) {
            M.toast({ html: `New visitor: ${Math.round(face.avgAge)} years old ${face.ethnicity} ${face.gender}` }, 10000);
          }
          switch (face.gender) {
            case 'male':
              male++; break;
            case 'female':
              female++; break;
          }

          if (face.avgAge < 18) {
            ages[0]++;
          } else if (face.avgAge < 25) {
            ages[1]++;
          } else if (face.avgAge < 35) {
            ages[2]++;
          } else if (face.avgAge < 50) {
            ages[3]++;
          } else {
            ages[4]++;
          }

          switch (face.ethnicity) {
            case 'asian':
              asian++; break;
            case 'black':
              black++; break;
            case 'hispanic':
              hispanic++; break;
            case 'white':
              white++; break;
          }

          switch (face.emotion) {
            case 'happiness':
              happy++; break;
            case 'sadness':
              sad++; break;
            default:
              neutral++;
          }
        });

        // console.log(this.graphGender.data.datasets[0].data);
        this.graphGender.data.datasets[0].data = [ male, female ];
        this.graphGender.update();

        this.graphAge.data.datasets[0].data = ages;
        this.graphAge.update();

        this.graphEthnicity.data.datasets[0].data = [ asian, black, hispanic, white ];
        this.graphEthnicity.update();

        this.graphEmotion.data.datasets[0].data = [ happy, neutral, sad ];
        this.graphEmotion.update();

        this.setState({ lastUpdate: Date.now() });
      });
  }

  reset = () => {
    axios.get('/api/reset')
      .then(res => { console.log(res.data); });
  }

  render() {
    return (
      <div className="main">
        <nav className="nav-extended">
          <div className="nav-wrapper">
            <div className="nav-left">
              <div className="brand-logo">
                <img className="spin" src="https://cdn.evbuc.com/images/37019559/17632711987/2/logo.png" alt=""/>
              </div>
              <p style={{
                fontSize: '24px',
                fontWeight: 'bold',
                margin: '0 20px' }}>Canada Learning Code - Dashboard
                <a className="waves-effect waves-light btn" style={{ marginLeft: '50px' }} onClick={this.reset}>RESET</a>
              </p>
            </div>
          </div>
        </nav>
        <div className="container-wrapper color-container-wrapper">
          <div className="flex-container">
            <div className="col">
              <canvas id="graphGender" />
            </div>
            <div className="col">
              <canvas id="graphAge" />
            </div>
          </div>
          <br />
          <br />
          <div className="flex-container">
            <div className="col">
              <canvas id="graphEthnicity" />
            </div>
            <div className="col">
              <canvas id="graphEmotion" />
            </div>
          </div>

        </div>
      </div>

    );
  }
}

class App extends Component {
  render() {
    return (
      <div className="App">
        {document.location.pathname === '/' ? (
          <WebcamCapture />
        ) : document.location.pathname === '/dashboard' ? (
          <Dashboard />
        ) : <h1>404 - Page not found</h1>}
      </div>
    );
  }
}

export default App;
