---
layout: post
title: "Zero Setup Federated Learning with 3 Google Colab Notebooks"
summary: "A short note on my OpenMined post: training across private datasets with nothing but Gmail accounts and Colab notebooks"
author: khoaguin
date: '2026-08-29'
keywords: federated-learning, syftbox, flower, google-colab, ppml, privacy, openmined
thumbnail: /_attachments/fl-colab/zero-setup-fl-thumb.png
permalink: /blog/zero-setup-federated-learning-colab
tags:
  - ppml
  - privacy
  - federated-learning
---

This is the short version of: **<a href="https://openmined.org/blog/zero-setup-federated-learning-google-colab/" target="_blank" rel="noopener noreferrer">Zero-Setup Federated Learning: Train Models Across Private Datasets Using Only Google Colab</a>** on OpenMined blog.

## Federated Learning Analogy

Think of federated learning as **mailing a worksheet to someone who owns a filing cabinet you are never allowed to open**. You write the questions. They read your worksheet first, decide it's safe, fill it in against their own files, and mail back only the answers. You staple everyone's answers together. The filing cabinet never moves.

That's the whole idea. The hard part has never been the math — it's that mailing the worksheet usually means Docker, an open port, and a two-week ticket with someone's IT department.

## Architecture

<img src="/_attachments/fl-colab/zero-setup-fl.png" style="width: 100%; height: auto;" alt="Architecture: data scientist Colab, SyftBox network with two datasites, two data-owner Colabs holding private data">

Three people, three Google Colab tabs. **The transport is each participant's own Google Drive**, which everybody already has, so there is nothing to install and no server to stand up.

## The two things that make it safe

**Mock data.** Every dataset a data owner publishes carries two paths: `mock_path` holds fake rows with the real shape, `private_path` holds the actual patients. The data scientist writes and debugs against the mock and never touches the real thing.

```python
do_client.create_dataset(
    name="pima-diabetes-hospital-a",
    mock_path=path_to_synthetic,   # what the data scientist codes against
    private_path=path_to_real,     # never leaves this Colab
    sync=True,
)
```

**Approval before execution.** The job arrives in the owner's datasite, but nothing runs until a human reads the code and says yes:

```python
do_client.jobs[0].approve()
do_client.process_approved_jobs()   # trains locally, on the real rows
```

Training happens inside *their* Colab, on *their* data. Only the weight updates travel back, where <a href="https://flower.ai/" target="_blank" rel="noopener noreferrer">Flower</a> averages them into a global model — trained on data I never saw.

Data never moves. Weights do.

👉 <a href="https://openmined.org/blog/zero-setup-federated-learning-google-colab/" target="_blank" rel="noopener noreferrer">The full post, with the runnable notebooks, is on the OpenMined blog</a>
