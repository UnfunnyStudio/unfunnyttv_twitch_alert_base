import say from "say";
import { v4 as uuidv4 } from 'uuid';



say.speak("What's up, dog?")

// tts fuc
const GetTts = (text="No tts?") => {
    const name = `${uuidv4()}.wav`
    say.export(text, null, 1,"public/tts/"+name, (err) => {
        if (err) {
            console.log("[WARN] failed to make tts: " + err.message)
            return null;
        }
    })
    return name;
}

console.log(GetTts("welp? llll"));
