# 📝 Deniable Diary

> A privacy-focused diary that uses Tether QVAC to generate plausible decoy entries entirely on-device.

Deniable Diary lets you write a real diary entry and then uses a local QVAC language model to generate three fictional diary entries. The real entry and the three decoys are shuffled together without labels.

The idea is simple: if someone opens the diary, there is no obvious label identifying which entry is the original.

## 🤖 QVAC at a Glance

This project uses the **Tether QVAC SDK** for local AI inference.

**QVAC SDK:** `@qvac/sdk` `^0.20.0`

The application calls:

* `loadModel()` — loads the local QVAC language model
* `completion()` — generates the three fictional diary entries
* `unloadModel()` — releases the model after generation

**Model:** `LLAMA_3_2_1B_INST_Q4_0`

The AI generation is performed locally through QVAC. No cloud AI API key is required.

## 🔐 How the App Works

```text
                    USER
                      │
                      ▼
              Writes real entry
                      │
             ┌────────┴────────┐
             │                 │
             ▼                 ▼
       Local storage      Local word count
        (encrypted)             │
                                 ▼
                         Target word range
                                 │
                                 ▼
                       Unrelated scenarios
                                 │
                                 ▼
                         QVAC loadModel()
                                 │
                                 ▼
                       QVAC completion()
                          × 3 decoys
                                 │
             ┌───────────────────┴──────────────────┐
             │                                      │
             ▼                                      ▼
        Real entry                              3 decoys
             │                                      │
             └───────────────────┬──────────────────┘
                                 ▼
                         Shuffle locally
                                 │
                                 ▼
                         Encrypt and save
```

### Important privacy property

The real diary entry is **not included in the QVAC generation prompt**.

QVAC receives only:

* an unrelated fictional scenario
* an approximate target word range
* instructions for writing a fictional diary entry

The model does not receive the user's actual diary story or previous diary entries.

### 🔒 Local Encryption

Diary batches are stored locally in:

```text
data/diary.enc
```

The diary data is encrypted using **AES-256-GCM**.

The encryption key is derived from the user's password using Node.js `scrypt`.

The application also stores a password verification record in:

```text
data/auth.json
```

The `data/` directory is excluded from Git, so local diary data is not committed to the repository.

### Important limitation

The password is kept in the server's in-memory session while the local application is running. This project is an experimental hackathon MVP, not a production security product.

## ✨ Features

* 📝 Write a private diary entry
* 🤖 Generate three AI-written decoys locally
* 🎲 Shuffle the real entry and decoys
* 🔒 Password-protected local diary
* 🔐 AES-256-GCM encrypted diary storage
* 🧠 QVAC local language-model inference
* ☁️ No cloud AI API required
* 🚫 Real diary text is excluded from the QVAC prompt

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

The project declares the QVAC SDK as a dependency:

```json
"@qvac/sdk": "^0.20.0"
```

### 3. Start the application

```bash
npm start
```

The application runs at:

```text
http://localhost:3000
```

Open that address in your browser.

### First run

On the first generation, QVAC may download the required local model. The initial model setup can take time depending on the machine and internet connection.

After the model is available, inference is performed locally by QVAC.

## 🧪 How to Use

### First launch

1. Open `http://localhost:3000`.
2. Create a diary password.
3. Write a real diary entry.
4. Click **Save privately**.
5. Wait while QVAC loads the local model and generates three decoys.
6. The application combines the real entry with the three decoys.
7. The four entries are shuffled and displayed without labels.

### Returning to the diary

1. Open the application.
2. Enter the diary password.
3. The encrypted diary is unlocked locally.
4. Previously saved batches can be viewed.

### Locking the diary

Click **Lock Diary** to end the current authenticated session.

## 🛡️ Privacy Architecture

The privacy boundary is intentionally simple:

```text
REAL DIARY ENTRY
       │
       ├──► Local word-count calculation
       │
       └──► Encrypted local storage


UNRELATED SCENARIO
       │
       ▼
  QVAC MODEL
       │
       ▼
 FICTIONAL DECOY
       │
       ├──► Decoy 1
       ├──► Decoy 2
       └──► Decoy 3


REAL ENTRY + DECOYS
       │
       ▼
 LOCAL SHUFFLE
       │
       ▼
 ENCRYPTED STORAGE
```

The real diary content never needs to be sent to a remote AI service.

## 📁 Project Structure

```text
deniable-diary/
├── src/
│   ├── diary.js        # QVAC integration, encryption, diary storage
│   ├── server.js       # Local HTTP server and web interface
│   ├── index.js        # Application entry point
│   └── test-qvac.js    # QVAC integration test
│
├── data/               # Local encrypted diary data (gitignored)
├── prd.md              # Product requirements document
├── README.md
├── LICENSE
├── package.json
└── package-lock.json
```

## ⚙️ Tech Stack

| Technology      | Purpose                                        |
| --------------- | ---------------------------------------------- |
| Node.js         | Application runtime                            |
| JavaScript      | Application logic                              |
| Tether QVAC SDK | On-device AI inference                         |
| QVAC LLM        | Decoy generation                               |
| Node HTTP       | Local web server                               |
| Node Crypto     | Password derivation and AES-256-GCM encryption |
| Local files     | Encrypted diary storage                        |

## 🎯 Hackathon Requirement Mapping

| Requirement                        | Implementation                                                  |
| ---------------------------------- | --------------------------------------------------------------- |
| QVAC SDK dependency                | `@qvac/sdk ^0.20.0`                                             |
| `loadModel()`                      | `src/diary.js`                                                  |
| `completion()`                     | `src/diary.js`                                                  |
| `unloadModel()`                    | `src/diary.js`                                                  |
| On-device inference                | QVAC local model                                                |
| Public GitHub repository           | This repository                                                 |
| Open-source license                | MIT License                                                     |
| README                             | This file                                                       |
| Local privacy use case             | Deniable Diary                                                  |
| No cloud AI API                    | QVAC inference is local                                         |
| Real diary excluded from AI prompt | `generateDecoy()` only receives fictional scenario + word range |

## ⚠️ Current MVP Limitations

This is an experimental hackathon MVP.

* Decoy quality depends on the local QVAC model.
* The application is not intended to provide production-grade security.
* The application requires the QVAC model to be available locally.
* The local Node server keeps the authenticated password in memory for the active session.
* Losing the diary password means the encrypted diary cannot be recovered through the application.

## 🔮 Possible Future Improvements

* More sophisticated decoy generation
* Mobile-focused interface
* Additional QVAC models
* Stronger session management
* Better diary organization
* Additional local privacy controls

## 📄 License

This project is released under the **MIT License**.

See the [LICENSE](./LICENSE) file for the full license text.

## 🔗 Repository

https://github.com/bigyan-codes/deniable-diary
