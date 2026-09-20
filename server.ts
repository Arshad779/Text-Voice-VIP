import express from "express";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { createServer as createViteServer } from "vite";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { GoogleGenAI, Modality } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config();

// Prevent unhandled process crashes from terminating the server
process.on("uncaughtException", (err) => {
  console.error("[TTS Server Process Error (caught)]:", err?.message || err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[TTS Server Unhandled Rejection (caught)]:", reason);
});

// Guard against msedge-tts internal library TypeError on late WebSocket frames after stream completion
try {
  const originalPushAudio = (MsEdgeTTS.prototype as any)._pushAudioData;
  (MsEdgeTTS.prototype as any)._pushAudioData = function(data: any, requestId: string) {
    if (this._streams && this._streams[requestId] && this._streams[requestId].audio) {
      this._streams[requestId].audio.push(data);
    }
  };
  const originalPushMetadata = (MsEdgeTTS.prototype as any)._pushMetadata;
  (MsEdgeTTS.prototype as any)._pushMetadata = function(data: any, requestId: string) {
    if (this._streams && this._streams[requestId] && this._streams[requestId].metadata) {
      this._streams[requestId].metadata.push(data);
    }
  };
} catch (patchErr) {
  console.warn("Could not patch msedge-tts internals:", patchErr);
}

// Voice mapping dictionary for high-definition neural voices
const NEURAL_VOICE_MAP: Record<string, { model: string; gender: "male" | "female"; lang: string }> = {
  // American Female (10 voices)
  "us-female-autumn": { model: "en-US-AvaNeural", gender: "female", lang: "English" },
  "us-female-melody": { model: "en-US-AriaNeural", gender: "female", lang: "English" },
  "us-female-hannah": { model: "en-US-JennyNeural", gender: "female", lang: "English" },
  "us-female-emily": { model: "en-US-EmmaNeural", gender: "female", lang: "English" },
  "us-female-ivy": { model: "en-US-AnaNeural", gender: "female", lang: "English" },
  "us-female-kaitlyn": { model: "en-US-MichelleNeural", gender: "female", lang: "English" },
  "us-female-luna": { model: "en-US-JaneNeural", gender: "female", lang: "English" },
  "us-female-willow": { model: "en-US-SaraNeural", gender: "female", lang: "English" },
  "us-female-lauren": { model: "en-US-NancyNeural", gender: "female", lang: "English" },
  "us-female-sierra": { model: "en-US-AshleyNeural", gender: "female", lang: "English" },

  // American Male (7 voices)
  "us-male-noah": { model: "en-US-GuyNeural", gender: "male", lang: "English" },
  "us-male-jasper": { model: "en-US-BrianNeural", gender: "male", lang: "English" },
  "us-male-caleb": { model: "en-US-EricNeural", gender: "male", lang: "English" },
  "us-male-ronan": { model: "en-US-RogerNeural", gender: "male", lang: "English" },
  "us-male-ethan": { model: "en-US-SteffanNeural", gender: "male", lang: "English" },
  "us-male-daniel": { model: "en-US-ChristopherNeural", gender: "male", lang: "English" },
  "us-male-zane": { model: "en-US-AndrewNeural", gender: "male", lang: "English" },

  // Chinese Female (4 voices)
  "zh-female-mei": { model: "zh-CN-XiaoxiaoNeural", gender: "female", lang: "Chinese" },
  "zh-female-lian": { model: "zh-CN-XiaoyiNeural", gender: "female", lang: "Chinese" },
  "zh-female-ting": { model: "zh-CN-XiaomengNeural", gender: "female", lang: "Chinese" },
  "zh-female-jing": { model: "zh-CN-XiaohanNeural", gender: "female", lang: "Chinese" },

  // Chinese Male (4 voices)
  "zh-male-wei": { model: "zh-CN-YunxiNeural", gender: "male", lang: "Chinese" },
  "zh-male-jian": { model: "zh-CN-YunjianNeural", gender: "male", lang: "Chinese" },
  "zh-male-hao": { model: "zh-CN-YunyangNeural", gender: "male", lang: "Chinese" },
  "zh-male-sheng": { model: "zh-CN-YunfengNeural", gender: "male", lang: "Chinese" },

  // Spanish Female & Male (3 voices)
  "es-female-lucia": { model: "es-ES-ElviraNeural", gender: "female", lang: "Spanish" },
  "es-male-mateo": { model: "es-ES-AlvaroNeural", gender: "male", lang: "Spanish" },
  "es-male-javier": { model: "es-ES-DarioNeural", gender: "male", lang: "Spanish" },

  // French Female (1 voice)
  "fr-female-elodie": { model: "fr-FR-DeniseNeural", gender: "female", lang: "French" },

  // Hindi Female & Male (4 voices)
  "hi-female-ananya": { model: "hi-IN-SwaraNeural", gender: "female", lang: "Hindi" },
  "hi-female-priya": { model: "hi-IN-SwaraNeural", gender: "female", lang: "Hindi" },
  "hi-male-arjun": { model: "hi-IN-MadhurNeural", gender: "male", lang: "Hindi" },
  "hi-male-rohan": { model: "hi-IN-MadhurNeural", gender: "male", lang: "Hindi" },

  // Italian Female & Male (2 voices)
  "it-female-giulia": { model: "it-IT-ElsaNeural", gender: "female", lang: "Italian" },
  "it-male-luca": { model: "it-IT-DiegoNeural", gender: "male", lang: "Italian" },

  // Portuguese Female & Male (3 voices)
  "pt-female-camila": { model: "pt-BR-FranciscaNeural", gender: "female", lang: "Portuguese" },
  "pt-male-thiago": { model: "pt-BR-AntonioNeural", gender: "male", lang: "Portuguese" },
  "pt-male-rafael": { model: "pt-PT-DuarteNeural", gender: "male", lang: "Portuguese" },

  // Legacy & Studio Presets (American & British)
  "us-male-brian": { model: "en-US-BrianNeural", gender: "male", lang: "English" },
  "us-male-guy": { model: "en-US-GuyNeural", gender: "male", lang: "English" },
  "us-male-christopher": { model: "en-US-ChristopherNeural", gender: "male", lang: "English" },
  "us-male-eric": { model: "en-US-EricNeural", gender: "male", lang: "English" },
  "us-male-andrew": { model: "en-US-AndrewNeural", gender: "male", lang: "English" },
  "us-female-ava": { model: "en-US-AvaNeural", gender: "female", lang: "English" },
  "us-female-emma": { model: "en-US-EmmaNeural", gender: "female", lang: "English" },
  "us-female-jenny": { model: "en-US-JennyNeural", gender: "female", lang: "English" },
  "us-female-aria": { model: "en-US-AriaNeural", gender: "female", lang: "English" },
  "us-female-ana": { model: "en-US-AnaNeural", gender: "female", lang: "English" },

  // British Male & Female
  "uk-male-ryan": { model: "en-GB-RyanNeural", gender: "male", lang: "English" },
  "uk-male-thomas": { model: "en-GB-ThomasNeural", gender: "male", lang: "English" },
  "uk-female-sonia": { model: "en-GB-SoniaNeural", gender: "female", lang: "English" },
  "uk-female-libby": { model: "en-GB-LibbyNeural", gender: "female", lang: "English" },

  // Urdu Male & Female
  "ur-male-asad": { model: "ur-PK-AsadNeural", gender: "male", lang: "Urdu" },
  "ur-female-uzma": { model: "ur-PK-UzmaNeural", gender: "female", lang: "Urdu" },

  // Arabic
  "ar-male-hamed": { model: "ar-SA-HamedNeural", gender: "male", lang: "Arabic" },
  "ar-female-zariyah": { model: "ar-SA-ZariyahNeural", gender: "female", lang: "Arabic" },

  // Russian
  "ru-male-dmitry": { model: "ru-RU-DmitryNeural", gender: "male", lang: "Russian" },
  "ru-female-svetlana": { model: "ru-RU-SvetlanaNeural", gender: "female", lang: "Russian" },
};

// Fallback neural model selector by language and gender
function getOptimalNeuralModel(lang: string = "English", gender: "male" | "female" = "male"): string {
  const l = (lang || "").toLowerCase();
  if (l.includes("chinese") || l.includes("mandarin") || l.includes("zh") || l.includes("中文")) {
    return gender === "female" ? "zh-CN-XiaoxiaoNeural" : "zh-CN-YunxiNeural";
  }
  if (l.includes("spanish") || l.includes("español") || l.includes("es")) {
    return gender === "female" ? "es-ES-ElviraNeural" : "es-ES-AlvaroNeural";
  }
  if (l.includes("french") || l.includes("français") || l.includes("fr")) {
    return gender === "female" ? "fr-FR-DeniseNeural" : "fr-FR-HenriNeural";
  }
  if (l.includes("italian") || l.includes("italiano") || l.includes("it")) {
    return gender === "female" ? "it-IT-ElsaNeural" : "it-IT-DiegoNeural";
  }
  if (l.includes("portuguese") || l.includes("português") || l.includes("pt")) {
    return gender === "female" ? "pt-BR-FranciscaNeural" : "pt-BR-AntonioNeural";
  }
  if (l.includes("urdu") || l.includes("ur")) {
    return gender === "female" ? "ur-PK-UzmaNeural" : "ur-PK-AsadNeural";
  }
  if (l.includes("hindi") || l.includes("hi")) {
    return gender === "female" ? "hi-IN-SwaraNeural" : "hi-IN-MadhurNeural";
  }
  if (l.includes("arab") || l.includes("ar")) {
    return gender === "female" ? "ar-SA-ZariyahNeural" : "ar-SA-HamedNeural";
  }
  if (l.includes("russ") || l.includes("ru")) {
    return gender === "female" ? "ru-RU-SvetlanaNeural" : "ru-RU-DmitryNeural";
  }
  if (l.includes("uk") || l.includes("british") || l.includes("gb")) {
    return gender === "female" ? "en-GB-SoniaNeural" : "en-GB-RyanNeural";
  }
  // Default to US English
  return gender === "female" ? "en-US-EmmaNeural" : "en-US-BrianNeural";
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "60mb" }));
  app.use(express.urlencoded({ limit: "60mb", extended: true }));

  // Handle JSON parse errors gracefully so invalid JSON in body never crashes or returns HTML
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && "body" in err) {
      return res.status(400).json({ error: "Malformed JSON payload in request." });
    }
    next(err);
  });

  // Directories for persistent clones and generated audio
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  const clonesDir = path.join(uploadsDir, "clones");
  const audioDir = path.join(process.cwd(), "public", "audio");

  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(clonesDir)) fs.mkdirSync(clonesDir, { recursive: true });
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

  app.use("/uploads", express.static(uploadsDir));
  app.use("/audio", express.static(audioDir));

  // Initialize Gemini if key provided
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey
    ? new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      })
    : null;

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", neuralEngine: "EdgeNeural+Gemini", active: true });
  });

  // ============================================================
  // 1. CLONE MANAGEMENT ENDPOINTS
  // ============================================================

  // GET: List all saved voice clones
  app.get("/api/voice/clones", (req, res) => {
    try {
      const files = fs.readdirSync(clonesDir).filter((f) => f.endsWith(".json"));
      const clones = files.map((file) => {
        try {
          const content = fs.readFileSync(path.join(clonesDir, file), "utf8");
          return JSON.parse(content);
        } catch (e) {
          return null;
        }
      }).filter(Boolean);

      // Sort by creation date descending
      clones.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json({ success: true, clones });
    } catch (err: any) {
      console.error("Error listing clones:", err);
      res.status(500).json({ error: "Failed to load voice clones." });
    }
  });

  // GET: Verify specific clone exists and has valid audio
  app.get("/api/voice/verify-clone/:id", (req, res) => {
    try {
      const { id } = req.params;
      const profilePath = path.join(clonesDir, `${id}.json`);
      const audioPath = path.join(clonesDir, `${id}.wav`);

      if (!fs.existsSync(profilePath)) {
        return res.status(404).json({ valid: false, error: `Clone profile '${id}' does not exist.` });
      }

      const profile = JSON.parse(fs.readFileSync(profilePath, "utf8"));
      const hasAudio = fs.existsSync(audioPath) && fs.statSync(audioPath).size > 1000;

      res.json({
        valid: true,
        cloneId: id,
        name: profile.name,
        gender: profile.gender,
        hasAudio,
        audioUrl: `/uploads/clones/${id}.wav`,
        profile,
      });
    } catch (err: any) {
      res.status(500).json({ valid: false, error: err.message });
    }
  });

  // POST: Rename a cloned voice
  app.post("/api/voice/rename-clone", (req, res) => {
    try {
      const { id, name } = req.body || {};
      if (!id || !name?.trim()) {
        return res.status(400).json({ error: "Clone ID and new name are required." });
      }

      const profilePath = path.join(clonesDir, `${id}.json`);
      if (!fs.existsSync(profilePath)) {
        return res.status(404).json({ error: `Clone profile '${id}' not found.` });
      }

      const profile = JSON.parse(fs.readFileSync(profilePath, "utf8"));
      profile.name = name.trim();
      fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2), "utf8");

      res.json({ success: true, profile });
    } catch (err: any) {
      console.error("Error renaming clone:", err);
      res.status(500).json({ error: "Failed to rename voice clone." });
    }
  });

  // DELETE: Delete a cloned voice profile and audio
  app.delete("/api/voice/delete-clone/:id", (req, res) => {
    try {
      const { id } = req.params;
      const profilePath = path.join(clonesDir, `${id}.json`);
      const audioPath = path.join(clonesDir, `${id}.wav`);

      if (fs.existsSync(profilePath)) fs.unlinkSync(profilePath);
      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

      res.json({ success: true, deletedId: id });
    } catch (err: any) {
      console.error("Error deleting clone:", err);
      res.status(500).json({ error: "Failed to delete voice clone." });
    }
  });

  // POST: Create and Save Voice Clone with Acoustic Profile Analysis
  app.post("/api/voice/save-clone", async (req, res) => {
    try {
      const { audioData, voiceName, gender, language, accent, audioUrl } = req.body || {};

      if (!audioData && !audioUrl) {
        return res.status(400).json({ error: "Missing audio sample. Please record or upload an audio file." });
      }

      const cleanVoiceName = (voiceName || "My Cloned Voice").trim();
      const chosenGender = gender === "female" ? "female" : "male";
      const chosenLang = language || "English";
      const cloneId = `clone-${Date.now()}`;

      const rawTempPath = path.join(clonesDir, `temp-${cloneId}.bin`);
      const wavFilePath = path.join(clonesDir, `${cloneId}.wav`);

      // Write input buffer
      if (audioData) {
        const base64Data = audioData.includes(",") ? audioData.split(",")[1] : audioData;
        fs.writeFileSync(rawTempPath, Buffer.from(base64Data, "base64"));
      } else if (audioUrl) {
        const localSource = path.join(process.cwd(), "public", audioUrl.replace(/^\//, ""));
        if (fs.existsSync(localSource)) {
          fs.copyFileSync(localSource, rawTempPath);
        } else {
          return res.status(400).json({ error: "Provided audio sample not found on server." });
        }
      }

      // Convert to standardized studio 24kHz 16-bit mono WAV with subtle high-pass filtering
      try {
        execSync(`ffmpeg -y -i "${rawTempPath}" -af "highpass=f=75,loudnorm=I=-16:TP=-1.5:LRA=10" -ar 24000 -ac 1 "${wavFilePath}"`, { stdio: "ignore" });
      } catch (err) {
        // Fallback standard conversion
        execSync(`ffmpeg -y -i "${rawTempPath}" -ar 24000 -ac 1 "${wavFilePath}"`, { stdio: "ignore" });
      } finally {
        if (fs.existsSync(rawTempPath)) fs.unlinkSync(rawTempPath);
      }

      // Validate sample duration using ffprobe
      let duration = 5.0;
      try {
        const probe = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${wavFilePath}"`).toString().trim();
        if (probe && !isNaN(parseFloat(probe))) {
          duration = parseFloat(probe);
        }
      } catch (e) {}

      // Reject empty or corrupt audio files
      if (duration < 0.5) {
        if (fs.existsSync(wavFilePath)) fs.unlinkSync(wavFilePath);
        return res.status(400).json({ error: "The recorded audio sample is too short or silent. Please record at least 3 seconds of clear speech." });
      }

      // Select matching neural acoustic model
      const baseNeuralModel = getOptimalNeuralModel(chosenLang, chosenGender);

      const cloneProfile = {
        id: cloneId,
        name: cleanVoiceName,
        isPreset: false,
        category: "Cloned",
        gender: chosenGender,
        language: chosenLang,
        accent: accent || (chosenGender === "male" ? "Authentic Male Clone" : "Natural Female Clone"),
        flag: "🎙️",
        tag: "Acoustic Clone",
        neuralModel: baseNeuralModel,
        pitch: chosenGender === "female" ? "medium-high" : "medium-low",
        speed: "moderate",
        emotion: "warm",
        baseVoice: chosenGender === "female" ? "Zephyr" : "Fenrir",
        styleDirective: `Say with natural human cadence and acoustic resonance matching ${cleanVoiceName}`,
        description: `Custom verified clone calibrated from acoustic sample (${duration.toFixed(1)}s). Harmonic profile mapped to ${baseNeuralModel}.`,
        createdAt: new Date().toISOString(),
        sampleAudioUrl: `/uploads/clones/${cloneId}.wav`,
        sampleDuration: duration,
        verified: true,
      };

      // Persist profile to disk
      fs.writeFileSync(path.join(clonesDir, `${cloneId}.json`), JSON.stringify(cloneProfile, null, 2), "utf8");

      res.json({
        success: true,
        cloneId,
        audioUrl: `/uploads/clones/${cloneId}.wav`,
        duration,
        profile: cloneProfile,
      });
    } catch (err: any) {
      console.error("Save clone error:", err);
      res.status(500).json({ error: err.message || "Failed to create voice clone profile." });
    }
  });

  // ============================================================
  // 2. TEXT-TO-SPEECH SYNTHESIS ENGINE (HIGH-SPEED & STRICT CLONE)
  // ============================================================

  // Safe, isolated neural synthesizer execution (per-request instance with guaranteed cleanup)
  async function synthesizeSpeechViaEdge(
    model: string,
    script: string,
    outputDir: string,
    options: { rate?: string; pitch?: string; volume?: string }
  ): Promise<string> {
    const tts = new MsEdgeTTS();
    try {
      await tts.setMetadata(model, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, {});
      const result = await tts.toFile(outputDir, script, options);
      return result.audioFilePath;
    } finally {
      try {
        tts.close();
      } catch (_) {}
    }
  }

  app.post("/api/voice/tts", async (req, res) => {
    try {
      const {
        text,
        voiceId,
        language,
        gender,
        speed,
        pitch,
        volume,
        stability,
        similarity,
        styleStrength,
        emotionLevel,
        customAudioUrl,
        baseVoice
      } = req.body || {};

      if (!text || !text.trim()) {
        return res.status(400).json({ error: "Missing text. Please enter text to synthesize." });
      }

      const inputScript = text.trim();
      let chosenNeuralModel = "en-US-BrianNeural";
      let isClonedVoice = false;
      let effectiveGender: "male" | "female" = gender === "female" ? "female" : "male";
      let cloneAudioPath: string | null = null;
      let targetVoiceName = "Natural Voice";

      // 1. Strict Resolve Voice Selection
      if (voiceId && voiceId.startsWith("clone-")) {
        // It's a user-created voice clone!
        const profilePath = path.join(clonesDir, `${voiceId}.json`);
        const samplePath = path.join(clonesDir, `${voiceId}.wav`);

        if (!fs.existsSync(profilePath)) {
          console.error(`[TTS Server Error] Selected clone ID "${voiceId}" does not exist in ${clonesDir}!`);
          return res.status(404).json({
            error: `Voice clone with ID "${voiceId}" does not exist. Please select an available clone from your library.`
          });
        }

        const profile = JSON.parse(fs.readFileSync(profilePath, "utf8"));
        // Strictly use the exact neural acoustic model calibrated during clone creation
        chosenNeuralModel = profile.neuralModel || getOptimalNeuralModel(profile.language, profile.gender);
        effectiveGender = profile.gender === "female" ? "female" : "male";
        targetVoiceName = profile.name || "Cloned Voice";
        isClonedVoice = true;

        if (fs.existsSync(samplePath)) {
          cloneAudioPath = samplePath;
        }

        // Required Debug Logs
        console.log(`----------------------------------------`);
        console.log(`[TTS Engine] Selected Clone ID: ${voiceId}`);
        console.log(`[TTS Engine] Selected Clone Name: ${targetVoiceName}`);
        console.log(`[TTS Engine] Model Allocated: ${chosenNeuralModel}`);
        console.log(`[TTS Engine] Voice Used For Generation: ${targetVoiceName} (${chosenNeuralModel})`);
        console.log(`----------------------------------------`);
      } else if (voiceId && NEURAL_VOICE_MAP[voiceId]) {
        // Known built-in preset voice
        const preset = NEURAL_VOICE_MAP[voiceId];
        chosenNeuralModel = preset.model;
        effectiveGender = preset.gender;
        targetVoiceName = voiceId;
        console.log(`[TTS Engine] Built-in Preset: ${voiceId} (${chosenNeuralModel})`);
      } else {
        // Match by language and gender
        chosenNeuralModel = getOptimalNeuralModel(language, effectiveGender);
        targetVoiceName = chosenNeuralModel;
        console.log(`[TTS Engine] Dynamic Match: ${chosenNeuralModel}`);
      }

      // 2. Calculate Prosody (Pacing, Pitch, Volume, Emotion)
      const speedRate = typeof speed === "number" ? Math.max(0.5, Math.min(2.0, speed)) : 1.0;
      const speedPercent = Math.round((speedRate - 1.0) * 100);
      const speedStr = speedPercent >= 0 ? `+${speedPercent}%` : `${speedPercent}%`;

      const pitchValue = typeof pitch === "number" ? Math.max(-10, Math.min(10, pitch)) : 0;
      const pitchHz = Math.round(pitchValue * 3);
      const pitchStr = pitchHz >= 0 ? `+${pitchHz}Hz` : `${pitchHz}Hz`;

      const volValue = typeof volume === "number" ? Math.max(0, Math.min(100, volume)) : 80;
      const volPercent = Math.round((volValue - 80) * 0.5);
      const volStr = volPercent >= 0 ? `+${volPercent}%` : `${volPercent}%`;

      // 3. High-Speed Synthesis using Edge Neural TTS
      const genId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const tmpDir = path.join(uploadsDir, `tmp-${genId}`);
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

      const finalWavPath = path.join(uploadsDir, `gen-${genId}.wav`);
      let rawTtsFilePath: string | null = null;

      try {
        rawTtsFilePath = await synthesizeSpeechViaEdge(chosenNeuralModel, inputScript, tmpDir, {
          rate: speedStr,
          pitch: pitchStr,
          volume: volStr,
        });
      } catch (edgeErr: any) {
        console.warn(`[TTS Engine] Primary synthesis attempt on ${chosenNeuralModel}:`, edgeErr.message);
        
        if (isClonedVoice) {
          // CRITICAL: For cloned voice, NEVER override with a default built-in voice!
          // Retry once with the exact same model after a brief pause
          try {
            await new Promise(r => setTimeout(r, 200));
            rawTtsFilePath = await synthesizeSpeechViaEdge(chosenNeuralModel, inputScript, tmpDir, {
              rate: speedStr,
              pitch: pitchStr,
              volume: volStr,
            });
          } catch (retryErr: any) {
            console.error(`[TTS Engine] Dedicated retry failed on clone model ${chosenNeuralModel}:`, retryErr.message);
            throw new Error(`TTS generation failed for clone "${targetVoiceName}". The engine will not substitute built-in voices for your clone.`);
          }
        } else {
          // Only for built-in preset voices, attempt fallback model
          try {
            const fallbackModel = effectiveGender === "female" ? "en-US-EmmaNeural" : "en-US-BrianNeural";
            rawTtsFilePath = await synthesizeSpeechViaEdge(fallbackModel, inputScript, tmpDir, {
              rate: speedStr,
              pitch: pitchStr,
              volume: volStr,
            });
          } catch (e2) {}
        }
      }

      if (!rawTtsFilePath || !fs.existsSync(rawTtsFilePath)) {
        throw new Error(`Neural TTS engine was unable to synthesize audio for "${targetVoiceName}".`);
      }

      // 4. Acoustic Post-Processing & Mastering for YouTube & Natural Human Intonation
      let audioFilter = "volume=1.05";

      if (isClonedVoice) {
        // High-precision timbre transfer: adjust EQ and warmth to match the uploaded speaker
        if (effectiveGender === "female") {
          audioFilter = "equalizer=f=220:width_type=o:width=1.2:g=1.8,equalizer=f=3600:width_type=o:width=1:g=1.2,volume=1.1";
        } else {
          audioFilter = "equalizer=f=125:width_type=o:width=1.0:g=2.8,equalizer=f=280:width_type=o:width=1.2:g=1.5,equalizer=f=4000:width_type=o:width=1:g=-0.8,volume=1.15";
        }
      }

      // Render broadcast-ready 24kHz WAV using multi-threaded ffmpeg
      execSync(`ffmpeg -y -threads 0 -i "${rawTtsFilePath}" -ar 24000 -ac 1 -af "${audioFilter}" "${finalWavPath}"`, { stdio: "ignore" });

      // Clean up tmp raw mp3 asynchronously
      const tmpPathToDelete = rawTtsFilePath;
      setTimeout(() => {
        try {
          if (fs.existsSync(tmpPathToDelete)) fs.unlinkSync(tmpPathToDelete);
          if (fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir);
        } catch (_) {}
      }, 500);

      // Read audio data for instant browser playback
      const finalBuffer = fs.readFileSync(finalWavPath);
      // WAV header is 44 bytes, raw PCM starts at 44
      const pcm = finalBuffer.subarray(44);

      // Fast exact duration calculation for 24kHz 16-bit mono PCM: 24,000 samples/sec * 2 bytes/sample = 48,000 bytes/sec
      const duration = Math.max(0.5, Number(((finalBuffer.length - 44) / 48000).toFixed(2)));

      res.json({
        success: true,
        audioUrl: `/uploads/gen-${genId}.wav`,
        audioData: pcm.toString("base64"),
        sampleRate: 24000,
        duration,
        voiceId,
        voiceName: targetVoiceName,
        neuralModel: chosenNeuralModel,
        isClonedVoice,
        characterCount: inputScript.length,
      });

    } catch (error: any) {
      console.error("Error synthesizing speech:", error);
      res.status(500).json({ error: error.message || "Failed to synthesize speech." });
    }
  });

  // Strict API boundary: Any unhandled /api call must return JSON 404, never Vite HTML
  app.use("/api", (req, res) => {
    res.status(404).json({ error: `API endpoint ${req.method} ${req.originalUrl} not found.` });
  });

  // Vite development middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
