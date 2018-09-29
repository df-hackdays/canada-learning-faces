import React, { Component } from 'react';
import axios from 'axios';
import './App.css';
import Webcam from 'react-webcam';

const config = {
  headers: {
    'app_id': 'bf1a2d64',
    'app_key': '3573890333195bdb7b49b9960444c489'
  },
  json: true
};
function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

const genderDetect = gender => {
  if (gender.type === 'M'){ return 'Male';}
  if (gender.type === 'F'){ return 'Female';}
}
const ethnicityDetect = data => {
  const newData = {asian: data.asian, black: data.black, hispanic: data.hispanic, white: data.white};
  const max = Math.min(Object.values(newData));
  return getKeyByValue(newData, max);
}
class WebcamCapture extends React.Component {
  setRef = webcam => {
    this.webcam = webcam;
  };

  state = {age: null, ethnicity: null, gender: null};
  componentDidMount () {
    setInterval(this.detect, 100000);
  }
  detect = () => {
    const imageSrc = this.webcam.getScreenshot();

    axios.post('https://api.kairos.com/detect', {
      "image": imageSrc
    }, config)
      .then(res => {
        try {
          const data = res.data.images[0].faces[0].attributes;
          console.log(data);
          this.setState({
            age: data.age,
            gender: genderDetect(data.gender),
            ethnicity: ethnicityDetect(data)
          });
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
          height={350}
          ref={this.setRef}
          screenshotFormat="image/jpeg"
          width={350}
          videoConstraints={videoConstraints}
        />
        <h1>Age: {this.state.age}</h1>
        <h1>Gender: {this.state.gender}</h1>
        <h1>Ethnicity: {this.state.ethnicity}</h1>
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
