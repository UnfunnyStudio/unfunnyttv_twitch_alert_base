// this provides simple text to wav, make sure to set the export path with `SetTTSExportPath()`
//

import say from "say";
import {parseFile} from "music-metadata";
import fs from "fs";

let _path = ""

export const SetTTSExportPath = (path) => {
    _path = path;
}

export const GetTts = (text = "No tts?") => {
    return new Promise(async (resolve, reject) => {
        const name = `${_path}${uuidv4()}.wav`;

        say.export(text, null, .85, name, async (err) => {
            if (err) {
                reject(err);
                return;
            }

            try {
                const metadata = await parseFile(name);
                const duration = metadata.format.duration; // in seconds!
                const audioBuffer = fs.readFileSync(name);
                const base64Audio = audioBuffer.toString('base64');
                const dataUrl = `data:audio/wav;base64,${base64Audio}`;

                resolve({dataUrl, duration});
            } catch (e) {
                reject(e);
            }
        });
    });
};
