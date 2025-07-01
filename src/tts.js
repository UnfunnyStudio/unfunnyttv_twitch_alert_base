import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
import { parseBuffer } from "music-metadata";  // use parseBuffer for in-memory
import { env } from "./jsonenv.js";

let _path = "";

export const SetTTSExportPath = (path) => {
    _path = path; // you may no longer need this if not saving files
};

const pollyClient = new PollyClient({
    region: env.AWS_REGION,
    credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
});

export const GetTts = (text = "No tts?") => {
    return new Promise(async (resolve, reject) => {
        try {
            const params = {
                OutputFormat: "mp3",       // mp3 output
                Text: text,
                VoiceId: "Brian",
            };

            const command = new SynthesizeSpeechCommand(params);
            const response = await pollyClient.send(command);

            const audioChunks = [];
            for await (const chunk of response.AudioStream) {
                audioChunks.push(chunk);
            }
            const audioBuffer = Buffer.concat(audioChunks);

            // Parse metadata directly from buffer (no file)
            const metadata = await parseBuffer(audioBuffer, 'audio/mpeg');
            const duration = metadata.format.duration; // seconds

            // Convert buffer to base64 data URL
            const base64Audio = audioBuffer.toString('base64');
            const dataUrl = `data:audio/mpeg;base64,${base64Audio}`;

            resolve({ dataUrl, duration });

        } catch (error) {
            reject(error);
        }
    });
};
