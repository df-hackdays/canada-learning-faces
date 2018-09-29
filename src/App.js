import React, { Component } from 'react';
import axios from 'axios';
import './App.css';
import Webcam from 'react-webcam';

const config = {
  headers: {
    'Ocp-Apim-Subscription-Key': 'b459b3b7b78e491f83cbb3d4fa43585e',
    'Content-Type': 'application/octet-stream'
  }
};

const config2 = {
  headers: {
    'Ocp-Apim-Subscription-Key': 'b459b3b7b78e491f83cbb3d4fa43585e',
    'Content-Type': 'application/json'
  }
};

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

const genderDetect = gender => {
  if (gender.type === 'M') { return 'Male'; }
  if (gender.type === 'F') { return 'Female'; }
};

const getKeyWithMaxValue = data => {
  const max = Math.max(...Object.values(data));
  return getKeyByValue(data, max);
};

const ethnicityDetect = data => {
  const newData = { asian: data.asian, black: data.black, hispanic: data.hispanic, white: data.white };
  return getKeyWithMaxValue(newData);
};

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

class WebcamCapture extends React.Component {
  setRef = webcam => {
    this.webcam = webcam;
  };

  state = { age: null, ethnicity: null, gender: null, id: null, emotion: null };
  componentDidMount() {
    // setInterval(this.detect, 7000);
  }
  detect = () => {
    try {
      const imageSrc = this.webcam.getScreenshot();
      const octet = b64ToOctet(imageSrc);
      axios.post('https://westcentralus.api.cognitive.microsoft.com/face/v1.0/detect?returnFaceId=true&returnFaceLandmarks=false&returnFaceAttributes=age,gender,emotion', octet, config)
        .then(res => {
          res.data.forEach((face) => {
            const attributes = face.faceAttributes;
            // console.log(data);
            this.setState({
              age: attributes.age,
              gender: attributes.gender,
              emotion: getKeyWithMaxValue(attributes.emotion)
            });
            axios.post('https://westcentralus.api.cognitive.microsoft.com/face/v1.0/findsimilars', {
              'faceId': face.faceId,
              'faceListId': 'test',
              'maxNumOfCandidatesReturned': 1,
              'mode': 'matchPerson'
            }, config2)
              .then(res => {
                if (res.data.length === 0) {
                  const {left, top, width, height} = face.faceRectangle;
                  axios.post(`https://westcentralus.api.cognitive.microsoft.com/face/v1.0/facelists/test/persistedFaces?targetFace=${left},${top},${width},${height}`, octet, config)
                    .then(res => {
                      this.setState({ id: `new user - ${res.data.persistedFaceId}` });
                      console.log(attributes);
                      console.log(`new user - ${res.data.persistedFaceId}`);
                      axios.post('https://api.kairos.com/detect', { image: imageSrc }, config3)
                        .then(res => {
                          const e = ethnicityDetect(res.data.images[0].faces[0].attributes);
                          this.setState({ ethnicity: e });
                        });
                    });
                } else {
                  this.setState({ id: `known user - ${res.data[0].persistedFaceId}` });
                  console.log(attributes);
                  console.log(`known user - ${res.data[0].persistedFaceId}`);
                  // axios.post('https://api.kairos.com/detect', {image: imageSrc}, config3)
                  //   .then(res => {
                  //     const e = ethnicityDetect(res.data.images[0].faces[0].attributes)
                  //     this.setState({ethnicity: e})
                  //   })
                }
              });
          } );

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
        <h3>Age: {this.state.age}</h3>
        <h3>Gender: {this.state.gender}</h3>
        <h3>ID: {this.state.id}</h3>
        <h3>Emotion: {this.state.emotion}</h3>
        <h3>Ethnicity: {this.state.ethnicity}</h3>
        <button onClick={this.detect}>Detect image</button>
      </div>
    );
  }
}

class App extends Component {
  render() {
    return (
      <div className="App">
        <WebcamCapture />
      </div>
    );
  }
}

export default App;
