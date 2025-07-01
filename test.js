import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
import { writeFileSync } from "fs";
import {env} from "./src/jsonenv.js";


const client = new PollyClient({
    region: env.AWS_REGION,
    credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
});

const params = {
    OutputFormat: "mp3",
    Text: "Hello, this is a test from AWS Polly using dotenv for credentials!",
    VoiceId: "Joanna",
};

async function synthesizeSpeech() {
    try {
        const command = new SynthesizeSpeechCommand(params);
        const response = await client.send(command);

        const audioChunks = [];
        for await (const chunk of response.AudioStream) {
            audioChunks.push(chunk);
        }
        const audioBuffer = Buffer.concat(audioChunks);

        writeFileSync("speech.mp3", audioBuffer);

        console.log("Speech synthesized and saved as speech.mp3");
    } catch (error) {
        console.error("Error synthesizing speech:", error);
    }
}

synthesizeSpeech();
