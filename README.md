# 📝 Deniable Diary

> A privacy-focused diary that creates plausible decoy entries using **local, on-device AI**.

Deniable Diary lets you write a real diary entry, then uses the **Tether QVAC SDK** to generate three fictional alternatives. The four entries are shuffled and stored together without labels.

The goal is simple: if someone looks at your diary, there is no obvious way to tell which entry is the real one.

## ✨ How It Works

```text
Write your real diary entry
          ↓
Calculate its approximate length locally
          ↓
QVAC generates 3 unrelated fictional entries
          ↓
Combine real entry + 3 decoys
          ↓
Shuffle all 4 entries
          ↓
Store locally without labels
```

### 🔒 Privacy by design

The most important part of the implementation is that **your real diary text is never given to the QVAC model**.

QVAC receives only:

* An unrelated fictional scenario
* A locally calculated target word range

This prevents the model from using private details from the real entry when generating the decoys.

**No cloud AI API is required.**

---

## 🤖 Why QVAC?

Deniable Diary is specifically designed around **on-device AI**.

A cloud-based implementation would introduce an unnecessary privacy problem for a diary application. QVAC allows the language model to run locally so the decoy-generation process can happen on the user's device.

The project uses the QVAC SDK's:

* `loadModel()`
* `completion()`
* `unloadModel()`

### Model

The MVP uses:

`LLAMA_3_2_1B_INST_Q4_0`

---

## 🚀 Installation

### Requirements

* Node.js 22+
* npm
* A machine capable of running the QVAC model locally

### 1. Clone the repository

```bash
git clone https://github.com/bigyan-codes/deniable-diary.git
cd deniable-diary
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the application

```bash
npm start
```

You should see:

```text
📝 Deniable Diary is running!
Open: http://localhost:3000
```

Open the application in your browser:

```text
http://localhost:3000
```

### First run

On the first generation, QVAC may need to download the local language model. This can take some time depending on your internet connection and machine.

After the model is available locally, diary generation happens **on-device**.

---

## 🧪 Try It

1. Open `http://localhost:3000`
2. Write a diary entry.
3. Click **Save privately**.
4. Wait while QVAC generates three decoys.
5. The application displays four unlabeled entries.
6. Only you know which one is the original.

### Example

```text
             Your real entry
                   +
          3 fictional entries
                   ↓
          ┌─────────────────┐
          │   Entry 1       │
          │   Entry 2       │
          │   Entry 3       │
          │   Entry 4       │
          └─────────────────┘
                   ↓
             Randomly shuffled
```

---

## 🛡️ Privacy Model

Deniable Diary is built around a simple privacy principle:

> **The AI should generate the decoys without reading the user's private story.**

### What QVAC receives

✅ Unrelated fictional scenarios
✅ Approximate target length

### What QVAC does NOT receive

❌ The real diary entry
❌ The user's personal details
❌ The user's previous diary entries

Diary data is stored locally in the application's `data/` directory.

The `data/` directory is excluded from Git through `.gitignore`.

---

## 📁 Project Structure

```text
deniable-diary/
├── src/
│   ├── diary.js          # Diary storage and QVAC decoy generation
│   ├── server.js         # Local web server and UI
│   ├── index.js          # Application entry point
│   └── test-qvac.js      # QVAC integration test
│
├── data/                 # Local diary data (gitignored)
├── prd.md                # Product requirements document
├── README.md
├── LICENSE
├── package.json
└── .gitignore
```

---

## ⚙️ Tech Stack

| Technology      | Purpose             |
| --------------- | ------------------- |
| Node.js         | Application runtime |
| JavaScript      | Application logic   |
| Tether QVAC SDK | Local AI inference  |
| QVAC LLM        | Decoy generation    |
| Node HTTP       | Local web server    |
| Local JSON      | Diary storage       |

---

## 🎯 Hackathon Focus

Deniable Diary was built for the **QVAC Hackathon** to explore a privacy-first use case for local AI.

The project demonstrates:

* ⚡ On-device AI inference
* 🔒 No remote AI API required
* 🧠 QVAC model loading and completion
* 📝 Local diary generation
* 🎲 AI-generated plausible decoys
* 🛡️ Keeping the user's real diary text outside the AI prompt

The project is designed to demonstrate how local AI can enable experiences where sending private user content to a remote AI service would undermine the purpose of the application.

---

## 🔐 Privacy Architecture

The real diary entry follows this path:

```text
User's diary entry
       │
       ├──► Local word-count calculation
       │
       └──► Stored locally
       
Unrelated scenarios
       │
       ▼
   QVAC model
       │
       ▼
  3 fictional decoys
       │
       ▼
Real entry + 3 decoys
       │
       ▼
Randomized collection
```

The real diary content is **not included in the QVAC generation prompt**.

---

## ⚠️ Current MVP Limitations

This is an experimental MVP.

* Local diary storage is currently plain JSON rather than encrypted storage.
* The app does not provide cryptographic proof that an entry is genuine or fake.
* Decoy quality depends on the local language model.
* The application is designed to demonstrate the concept rather than provide production-grade secure storage.

These limitations are intentionally documented rather than hidden.

---

## 🔮 Future Improvements

Possible future versions could include:

* 🔐 Encrypted local diary storage
* ✍️ More natural and varied decoy generation
* 🎲 Stronger randomization
* 📱 Mobile-friendly interface
* 🔑 Optional local authentication
* 🧠 Additional local QVAC models
* 🗂️ Better diary organization and search

---

## 📄 License

This project is released under the **MIT License**.

---

## 🔗 Repository

**GitHub:**
https://github.com/bigyan-codes/deniable-diary

---

## 🙌 Built With

Built with **Node.js** and the **Tether QVAC SDK** for the QVAC Hackathon.

**Local AI. Private data. Plausible deniability.**
