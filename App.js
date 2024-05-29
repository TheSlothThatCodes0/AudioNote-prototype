// import { AppRegistry } from "react-native";
// AppRegistry.registerComponent(appName, () => App());
import React, { useState, useEffect } from "react";

import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Alert,
  Platform,
} from "react-native";
import Slider from "@react-native-community/slider";
import * as FileSystem from "expo-file-system";
import * as Permissions from "expo-permissions";
import * as Sharing from "expo-sharing";
import { Audio } from "expo-av";
import axios from "axios";

import OpenAI from "openai";
import { API_KEY, Google_API_KEY } from "./config";
// import { RNFFmpeg } from 'react-native-ffmpeg';


const openai = new OpenAI({
  apiKey: API_KEY,
});

export default function App() {
  const [recording, setRecording] = useState(null);
  const [sound, setSound] = useState(null);
  const [progress, setProgress] = useState(0);
  const [gainValue, setGainValue] = useState(1);
  const [uri, setUri] = useState("");
  const [generatedResponse, setGeneratedResponse] = useState("");

  useEffect(() => {
    getPermissions();
  }, []);

  const getPermissions = async () => {
    const { status: micStatus } = await Permissions.askAsync(
      Permissions.AUDIO_RECORDING
    );
    let storageStatus;
    if (Platform.OS === "ios") {
      storageStatus = (await Permissions.askAsync(Permissions.MEDIA_LIBRARY))
        .status;
    } else {
      storageStatus = (
        await Permissions.askAsync(Permissions.WRITE_EXTERNAL_STORAGE)
      ).status;
    }

    if (micStatus !== "granted" || storageStatus !== "granted") {
      Alert.alert(
        "Permissions Denied",
        "This app requires microphone and storage permissions to function correctly.",
        [{ text: "OK" }]
      );
    }
  };

  // const audioAmplify = async (inputFilePath, outputFilePath, amplificationFactor) => {
  //   try {
  //     const ffmpegCommand = `-i ${inputFilePath} -filter:a "volume=${amplificationFactor}" ${outputFilePath}`;
  //     const { rc } = await RNFFmpeg.execute(ffmpegCommand);

  //     if (rc === 0) {
  //       console.log("Audio amplified successfully");
  //     } else {
  //       console.error("Failed to amplify audio");
  //     }
  //   } catch (error) {
  //     console.error("Error amplifying audio:", error);
  //   }
  // }

  async function startRecording() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
  
      const recordingOptions = {
        android: {
          extension: ".m4a",
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          bitRateMode: Audio.RECORDING_OPTION_ANDROID_BIT_RATE_MODE_CBR,
          gain: gainValue, // Set the gain here
        },
        ios: {
          extension: ".caf",
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MAX,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
          gain: gainValue, // Set the gain here
        },
      };
  
      const { recording } = await Audio.Recording.createAsync(
        recordingOptions,
        (status) => setProgress(status.durationMillis / 1000)
      );
  
      recording.setProgressUpdateInterval(100);
      recording.setOnRecordingStatusUpdate((status) => {
        setProgress(status.durationMillis / 1000);
      });
  
      setRecording(recording);
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  }

      

      async function stopRecording() {
        try {
          await recording.stopAndUnloadAsync();
          const uri = recording.getURI();
          console.log("Recording stopped and stored at", uri);
    
          const mp3Uri = `${FileSystem.documentDirectory}recording.mp3`;
          await FileSystem.copyAsync({ from: uri, to: mp3Uri });
          await FileSystem.deleteAsync(uri);
          // audioAmplify(mp3Uri, mp3Uri, gainValue);
    
          console.log("Recorded audio stored as MP3 at", mp3Uri);
          setUri(mp3Uri);
    
          // console.log("Transcribing audio...");
          // const formData = new FormData();
          // formData.append("audio", {
          //   uri: mp3Uri,
          //   type: "audio/mp3",
          //   name: "recording.mp3",
          // });
    
          // const response = await axios.post(
          //   "http://localhost:3000/transcribe",
          //   formData,
          //   {
          //     headers: {
          //       "Content-Type": "multipart/form-data",
          //     },
          //   }
          // );
    
          // console.log("Transcription:", response.data.transcription);
          // console.log("Audio transcription complete.");
    
          setRecording(null); // Update the state to reflect that recording has stopped
          setProgress(0);
        } catch (err) {
          console.error("Failed to stop recording", err);
        }
      }

  async function playRecording() {
    try {
      if (uri) {
        console.log("Loading sound from", uri);
        const { sound } = await Audio.Sound.createAsync({ uri });
        setSound(sound);

        console.log("Playing sound...");
        await sound.playAsync();
      } else {
        console.log("No URI set for the recording.");
      }
    } catch (err) {
      console.error("Failed to play recording", err);
    }
  }

  async function shareRecording() {
    try {
      if (uri) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert(
          "No Recording",
          "There is no recording available to share."
        );
      }
    } catch (err) {
      console.error("Failed to share recording", err);
      Alert.alert(
        "Share Failed",
        "An error occurred while trying to share the recording."
      );
    }
  }

  const generateResponse = async (audioUri) => {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: audioUri }],
      });

      console.log("Generated response:", response.choices[0].message.content);
      setGeneratedResponse(response.choices[0].message.content);
    } catch (error) {
      console.error("Failed to generate response:", error);
      Alert.alert(
        "Response Generation Failed",
        "An error occurred while trying to generate the response."
      );
    }
  };

  useEffect(() =>      {   
    if (recording) {
      Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldActivateAudio: true,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_MIX_WITH_OTHERS,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DUCK_OTHERS,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true,
      });
    }

    return sound
      ? () => {
          console.log("Unloading sound...");
          sound.unloadAsync();
        }
      : undefined;
  }, [recording, sound]);

  return (
    <View style={styles.container}>
      <View style={styles.recorder}>
        <TouchableOpacity
          style={styles.button}
          onPress={recording ? stopRecording : startRecording}
        >
          <Text>{recording ? "Stop Recording" : "Start Recording"}</Text>
        </TouchableOpacity>
        <Text>Recording Progress: {progress.toFixed(2)} s</Text>
        {uri ? (
          <>
            <TouchableOpacity style={styles.button} onPress={playRecording}>
              <Text>Play Recording</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={shareRecording}>
              <Text>Share Recording</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>
      <View style={styles.responseContainer}>
        <Text>Generated Response:</Text>
        <Text>{generatedResponse}</Text>
      </View>
      <View style={styles.gain}>
        <Text>Mic Gain</Text>
        <Slider
          style={{ width: 200, height: 40 }}
          minimumValue={0}
          maximumValue={10}
          value={gainValue}
          onValueChange={(value) => setGainValue(value)}
          step={0.1}
        />
        <Text>{gainValue.toFixed(1)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  recorder: {
    marginBottom: 20,
  },
  responseContainer: {
    marginVertical: 20,
    alignItems: "center",
  },
  button: {
    backgroundColor: "#ccc",
    padding: 10,
    borderRadius: 5,
    marginVertical: 5,
  },
  gain: {
    flexDirection: "row",
    alignItems: "center",
  },
});
