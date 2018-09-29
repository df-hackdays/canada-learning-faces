import React, { Component } from 'react';
import axios from 'axios';
import './index.css';
import Webcam from 'react-webcam';

import Chart from "chart.js";

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
  }
}

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
    setInterval(this.detect, 1400);
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
                      axios.post('http://localhost:3001/faces', {id: res.data.persistedFaceId, face: face, img: imageSrc}, {json: true})
                        .then(res => {
                          console.log(res.data);
                          this.setState({ethnicity: res.data.ethnicity,
                            age: res.data.avgAge,
                            gender: res.data.gender,});
                        })
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
                  axios.get(`http://localhost:3001/faces/${res.data[0].persistedFaceId}`)
                    .then(r => {
                      const payload = {id: res.data[0].persistedFaceId, face: face};
                      if (r.data.error) {
                        payload.img = imageSrc;
                      }
                      axios.post('http://localhost:3001/faces', payload, {json: true})
                        .then(res => {
                          console.log(res.data);
                          this.setState({ethnicity: res.data.ethnicity,
                            age: res.data.avgAge,
                            gender: res.data.gender,});
                        })
                    })

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
      facingMode: 'user'
    };

    return (
      <div>
        <Webcam
          audio={false}
          ref={this.setRef}
          screenshotFormat="image/jpeg"
          videoConstraints={videoConstraints}
          style={{ transform: 'scale(-1, 1)' }}
        />
        <h3>Age: {Math.round(this.state.age)}</h3>
        <h3>Gender: {this.state.gender}</h3>
        <h3>ID: {this.state.id}</h3>
        <h3>Emotion: {this.state.emotion}</h3>
        <h3>Ethnicity: {this.state.ethnicity}</h3>
        <button onClick={this.detect}>Detect image</button>
      </div>
    );
  }
}


const color = {"red":"rgb(255, 99, 132)","orange":"rgb(255, 159, 64)","yellow":"rgb(255, 205, 86)","green":"rgb(75, 192, 192)","blue":"rgb(54, 162, 235)","purple":"rgb(153, 102, 255)","grey":"rgb(201, 203, 207)"};
class Dashboard extends Component {

  state = {ageData: null, ethnicityData: null, genderData: null};


  componentDidMount() {
    const genderData = {
      datasets: [{
        data: [
          0, 0
        ],
        backgroundColor: [
          color.red, color.blue
        ],
        label: 'Gender'
      }],
      labels: [
        'Male', 'Female'
      ]
    };
    const ethnicityData = {
      datasets: [{
        data: [
          0, 0, 0, 0, 0
        ],
        backgroundColor: [
          color.red, color.yellow, color.green, color.blue
        ],
        label: 'Gender'
      }],
      labels: [
        'Asian', 'Black', 'Hispanic', 'White'
      ]
    };
    let graphGender = document.getElementById("graphGender");
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
        responsive: true
      }
    });
    let graphAge = document.getElementById("graphAge");
    this.graphAge = new Chart(graphAge, {
      type: 'pie',
      data: null,
      options: {
        title: {
          display: true,
          text: 'Age',
          fontColor: '#ddd',
          fontStyle: 500,
          fontSize: 30
        },
        responsive: true
      }
    });
    let graphEthnicity = document.getElementById("graphEthnicity");
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
        responsive: true
      }
    });
    this.updateData();
    setInterval(() => {
      this.updateData;
    }, 1000);
  }

  updateData() {
    axios.get('http://localhost:3001/faces')
      .then(res => {
        const faces = res.data;
        let male=0, female=0;
        let asian=0, black=0, hispanic=0, white=0;
        faces.forEach(face => {
          switch (face.gender) {
            case 'male':
              male++; break;
            case 'female':
              female++; break;
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
        })

        // console.log(this.graphGender.data.datasets[0].data);
        this.graphGender.data.datasets[0].data= [ male, female];
        this.graphGender.update();

        this.graphEthnicity.data.datasets[0].data= [ asian, black, hispanic, white];
        this.graphEthnicity.update();

      })
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
                fontWeight: 'bold', margin: '0 20px'}}>Canada Learning Code - Dashboard</p>
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
            <div className="col-small">
            </div>
            <div className="col">
              <canvas id="graphEthnicity" />
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
        {document.location.pathname==='/' ? (
          <WebcamCapture />
        ) : document.location.pathname==='/dashboard' ? (
          <Dashboard />
        ) : <h1>404 - Page not found</h1>}
      </div>
    );
  }
}

export default App;
