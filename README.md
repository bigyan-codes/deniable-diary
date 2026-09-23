# Deniable Diary — Product Requirements Document

## 1. Project Overview

Deniable Diary is a privacy-focused local diary application built for the QVAC Hackathon.

The core idea is simple:

1. The user writes one real diary entry.
2. QVAC runs locally on the user's device.
3. QVAC generates three plausible fictional diary entries.
4. The real entry and three fictional entries are securely shuffled.
5. The four entries are stored locally without real/fake labels.
6. The user remembers which entry is their real entry.

The application is designed to make it harder for another person with access to the diary to determine which entry is genuine.

## 2. Problem

A normal private diary clearly reveals which text is real.

If someone gains access to an unlocked diary application or its stored data, they can immediately identify the user's actual memories.

Deniable Diary introduces plausible decoys so that the stored collection does not explicitly identify the genuine entry.

## 3. Why QVAC

The privacy model depends on local AI generation.

Using a cloud AI service would require sending private diary information to an external service and would introduce an account, API key, network dependency, and potential usage costs.

QVAC allows the language model to run locally on the user's device.

The application therefore uses the QVAC SDK for on-device inference.

## 4. Core Features

### 4.1 Diary Composer

The user can write a personal diary entry in a local web interface.

### 4.2 Local AI Decoy Generation

The application uses the QVAC SDK and a local LLM to generate three fictional diary entries.

The decoy generator receives unrelated scenario instructions rather than the user's actual diary text.

### 4.3 Secure Shuffling

The real entry and generated decoys are combined and shuffled using cryptographically secure random bytes provided by Node.js.

### 4.4 Unlabeled Storage

The four entries are stored locally without a field identifying which entry is real.

### 4.5 Local Reader

The user can view previously generated batches through the local application.

## 5. Privacy Requirements

- No cloud AI API.
- No user account required.
- No intentional remote transmission of diary content.
- AI inference must run locally through QVAC.
- Diary data remains on the local machine.
- Stored entries must not contain a real/fake label.
- Private diary storage must not be committed to Git.

## 6. MVP User Flow

```text
Open application
      ↓
Write real diary entry
      ↓
Select "Save privately"
      ↓
Load local QVAC model
      ↓
Generate 3 fictional decoys
      ↓
Combine real entry + 3 decoys
      ↓
Securely shuffle entries
      ↓
Store locally
      ↓
Display four unlabeled entries