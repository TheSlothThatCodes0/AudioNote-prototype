package com.myaudioapp;

import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.media.AudioFormat;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class MyMicrophoneModule extends ReactContextBaseJavaModule {

    private static final int SAMPLE_RATE = 44100;
    private AudioRecord audioRecord;
    private boolean isRecording = false;
    private Thread recordingThread;

    public MyMicrophoneModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "MyMicrophoneModule";
    }

    @ReactMethod
    public void startRecording(float gain) {
        if (isRecording) {
            return;
        }

        int bufferSize = AudioRecord.getMinBufferSize(SAMPLE_RATE,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT);

        audioRecord = new AudioRecord(MediaRecorder.AudioSource.MIC, SAMPLE_RATE,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT, bufferSize);

        audioRecord.startRecording();
        isRecording = true;

        recordingThread = new Thread(new AudioRecordingRunnable(bufferSize, gain));
        recordingThread.start();
    }

    @ReactMethod
    public void stopRecording() {
        if (!isRecording) {
            return;
        }

        isRecording = false;
        audioRecord.stop();
        audioRecord.release();
        audioRecord = null;
        recordingThread = null;
    }

    private class AudioRecordingRunnable implements Runnable {

        private int bufferSize;
        private float gain;

        AudioRecordingRunnable(int bufferSize, float gain) {
            this.bufferSize = bufferSize;
            this.gain = gain;
        }

        @Override
        public void run() {
            short[] buffer = new short[bufferSize];

            while (isRecording) {
                int read = audioRecord.read(buffer, 0, buffer.length);

                for (int i = 0; i < read; i++) {
                    buffer[i] = (short) Math.min(Math.max(buffer[i] * gain, Short.MIN_VALUE), Short.MAX_VALUE);
                }

                // Process the buffer with adjusted gain as needed
                // (e.g., save to file, stream to server, etc.)
            }
        }
    }
}
