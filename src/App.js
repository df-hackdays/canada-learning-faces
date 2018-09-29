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


function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

const genderDetect = gender => {
  if (gender.type === 'M'){ return 'Male';}
  if (gender.type === 'F'){ return 'Female';}
}

const getKeyWithMaxValue = data => {
  const max = Math.max(...Object.values(data));
  return getKeyByValue(data, max);
}


const ethnicityDetect = data => {
  const newData = {asian: data.asian, black: data.black, hispanic: data.hispanic, white: data.white};
  return getKeyWithMaxValue(newData);
}

function b64toBlob(b64Data, contentType, sliceSize) {
  contentType = contentType || '';
  sliceSize = sliceSize || 512;

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

  var blob = new Blob(byteArrays, {type: contentType});
  return blob;
}

class WebcamCapture extends React.Component {
  setRef = webcam => {
    this.webcam = webcam;
  };

  state = {age: null, ethnicity: null, gender: null, id: null, emotion: null};
  componentDidMount () {
    setInterval(this.detect, 7000);
  }
  detect = () => {
    const imageSrc = this.webcam.getScreenshot();
    var block = imageSrc.split(";");
// Get the content type of the image
    var contentType = block[0].split(":")[1];// In this case "image/gif"
// get the real base64 content of the file
    var realData = block[1].split(",")[1];
    axios.post('https://westcentralus.api.cognitive.microsoft.com/face/v1.0/detect?returnFaceId=true&returnFaceLandmarks=false&returnFaceAttributes=age,gender,emotion', b64toBlob(realData), config)
      .then(res => {
        try {
          const data = res.data[0].faceAttributes;
          // console.log(data);
          console.log(data.emotion);
          console.log(getKeyWithMaxValue(data.emotion));
          this.setState({
            age: data.age,
            gender: data.gender,
            emotion: getKeyWithMaxValue(data.emotion)
            // attributes:
            // id: res.data[0].faceId
            // ethnicity: ethnicityDetect(data)
          });
          axios.post('https://westcentralus.api.cognitive.microsoft.com/face/v1.0/findsimilars',{
              "faceId": res.data[0].faceId,
              "faceListId": "test",
              "maxNumOfCandidatesReturned": 10,
              "mode": "matchPerson"
            },config2
          )
            .then(res => {
              console.log(res.data);
              if (res.data.length === 0) {
                axios.post('https://westcentralus.api.cognitive.microsoft.com/face/v1.0/facelists/test/persistedFaces', b64toBlob(realData), config)
                  .then(res => {
                    console.log(res.data);
                    this.setState({id: `new user - ${res.data.persistedFaceId}` });
                  })
              } else {
                this.setState({id: `known user - ${res.data[0].persistedFaceId}`});
              }
            })

        } catch (e) {

        }

      })
  };

  render() {
    const videoConstraints = {
      width: 1280,
      height: 720,
      facingMode: "user"
    };

    return (
      <div>
        <Webcam
          audio={false}
          ref={this.setRef}
          screenshotFormat="image/jpeg"
          videoConstraints={videoConstraints}
        />
        <h1>Age: {this.state.age}</h1>
        <h1>Gender: {this.state.gender}</h1>
        <h1>ID: {this.state.id}</h1>
        <h1>Emotion: {this.state.emotion}</h1>
        {/*<h1>Ethnicity: {this.state.ethnicity}</h1>*/}
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
