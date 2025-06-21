---
layout: post
title: "Detecting Heart Abnormalities using 1D CNN on Data You Cannot See"
summary: Preserve sensitive training data privacy with split neural network and PySyft
author: khoaguin
date: '2021-10-07'
usemathjax: true
keywords: pysyft, ppml, medical-ai
thumbnail: /_attachments/heartbeat.jpg
permalink: /blog/detect-heart-abnormalities-1d-cnn-pysyft
tags:
  - ppml
  - medical-ai
---

![](./_attachments/heartbeat.jpg)
## TL;DR:
We apply the split learning architecture to train a 1D CNN model on heartbeat data and accurately detect heart abnormalities while preserving data privacy
### Well, that’s still too long, and words are cheap, just show me the code!
<a href="https://github.com/khoaguin/priv-sec-ai-blog/blob/master/ecg-split-1DCNN-PySyft/ecg-split-1DCNN.ipynb" target="_blank">Here</a> you go, enjoy! And please leave a <a class="github-button" href="https://github.com/khoaguin/priv-sec-ai-blog" data-color-scheme="no-preference: dark; light: dark; dark: dark;" data-icon="octicon-star" data-size="large" data-show-count="true">Star</a> if you find it useful.

Also, if you prefer to read on Medium and give some claps for encouragement, <a href="https://medium.com/data-science/detecting-heart-abnormalities-using-1d-cnn-on-data-you-cannot-see-with-pysyft-735481a952d8" target="_blank">here</a> is the link.
## Introduction
Machine Learning (ML) is a subfield of Artificial Intelligence where algorithms are trained to find patterns from massive datasets. These patterns are then used to make decisions and predictions on new data. One of the problems that ML faces today is data sharing: data scientists need to gather a large amount of data from data owners in order to train their algorithms. This is often not ideal, especially for sensitive data in sectors such as healthcare or finance. Split learning is one of the methods in Privacy Preserving Machine Learning (PPML) that tries to address this data privacy problem.

Split learning refers to the process of cutting a Deep Neural Network (DNN) into two or more parts. In the simplest scenario, i.e. there is only one data owner (the client) and one data scientist (the server), the DNN is split into two parts. The first part of the DNN is employed on the client’s machine where the data reside, and the second part is employed on the server’s side. The client’s model will learn a set of features (also called “activation maps”) from the dataset, then sends those activation maps to the server to continue the training process. Then, during the backward pass, the server calculates the loss function and the gradients of the loss up to the split layer, then sends those gradients back to the client so he can continue the backward pass. This way, the server/data scientist never gets to see the input training data, but can still train the network. You can learn more about the fundamentals of split learning from this <a href="https://blog.openmined.org/split-neural-networks-on-pysyft/" target="_blank">tutorial</a>.

In this blog post, we will walk through the process of training a split neural network using OpenMined’s framework <a href="https://github.com/OpenMined/PySyft" target="_blank">PySyft: a Python library for computing on data you do not own and cannot see</a>. In OpenMined’s free course <a href="https://courses.openmined.org/courses/foundations-of-private-computation" target="_blank">“Foundations of Private Computation”</a>, there is already a tutorial on how to train a split DNN using PySyft’s Duet with two Jupyter notebooks: one to represent the client, and the other to represent the server. However, if you are developing a new split learning method, using two notebooks is quite bothersome as you have to switch back and forth. Luckily, there is another feature of PySyft called VirtualMachine that allows us to develop a split DNN in only one jupyter notebook or python file. We will learn how to use it today, along with PySyft’s other features such as RemoteDataset and RemoteDataLoader to load a custom remote dataset. Most importantly, we will discover how to train a split 1D CNN neural network to detect heart abnormalities on input data that never leave the client’s machine, based on the work from[^1].

## Let’s jump into it
First, we need to import the necessary packages and define the paths to the necessary files. I used `torch 1.8.1+cu102` and `syft 0.5.0`.

```python
from pathlib import Path

import h5py
import matplotlib.pyplot as plt
import numpy as np
from icecream import ic  # easy printing for debugging
from tqdm import tqdm

plt.style.use('dark_background')

import syft as sy
import torch
import torch.nn as nn
from torch.optim import SGD, Adam
from torch.utils.data import DataLoader, Dataset

print(f'torch version: {torch.__version__}')
print(f'syft version: {sy.__version__}')

project_path = Path.cwd()
print(f'project_path: {project_path}')
# paths to files and directories
train_name = 'train_ecg.hdf5'
test_name = 'test_ecg.hdf5'
```
### Defining the client and the server
Using PySyft’s VirtualMachine, we can define abstract actors in this scenario like in the code below.
```python
server = sy.VirtualMachine(name="server")
client = server.get_root_client()
remote_torch = client.torch
```

### Client: loading and exploring the dataset
First, let’s assume to be the client (data owner) and discover the dataset. We will use <a href="https://physionet.org/content/mitdb/1.0.0/" target="_blank">MIT-BIH arrhythmia</a>, a popular dataset for ECG signal classification or arrhythmia diagnosis[^2]. You can find the original dataset <a href="https://physionet.org/content/mitdb/1.0.0/" target="_blank">here</a>, however, we use the processed data from <a href="https://github.com/SharifAbuadbba/split-learning-1D/blob/master/preprocess/ecg_preprocess.ipynb" target="_blank">here</a>. Below is the code needed to load the dataset from `train_ecg.hdf5` and `test_ecg.hdf5`.
```python
class ECG(Dataset):
    # The class used to load the ECG dataset
    def __init__(self, mode='train'):
        if mode == 'train':
            with h5py.File(project_path/train_name, 'r') as hdf:
                self.x = torch.tensor(hdf['x_train'][:], dtype=torch.float)
                self.y = torch.tensor(hdf['y_train'][:])
        elif mode == 'test':
            with h5py.File(project_path/test_name, 'r') as hdf:
                self.x = torch.tensor(hdf['x_test'][:], dtype=torch.float)
                self.y = torch.tensor(hdf['y_test'][:])
        else:
            raise ValueError('Argument of mode should be train or test')
    
    def __len__(self):
        return len(self.x)
    
    def __getitem__(self, idx):
        return self.x[idx], self.y[idx]
```
The post-processing dataset consists of 26 490 heartbeat samples in total, each one is a time-series vector of length 128. There are 5 different types of heartbeats as classification targets: normal beat (class 0), left bundle branch block (class 1), right bundle branch block (class 2), atrial premature contraction (class 3), ventricular premature contraction (class 4). We can see an example of each class in Figure 1 below.

![](https://live.staticflickr.com/65535/51561872348_4b01d06389_w.jpg)

*Figure 1: the ECG dataset*

The client then loads the datasets and saves them into `.pt` files and sends them to the server, using the code below.
```python
train_dataset = ECG(mode='train')
test_dataset = ECG(mode='test')
torch.save(train_dataset, "train_dataset.pt")
torch.save(test_dataset, "test_dataset.pt")
```
If using `duet`, he can send the string path to the server with this syntax (note that we do not use `duet` this time)
```python
sy.lib.python.String(string_path).send(duet, pointable=True, tags=["data"])
```

### Server: creating the remote dataset and remote data loader
Now, after receiving the `.pt` path of the dataset from the client, the server creates the RemoteDataset and RemoteDataLoader on the remote side.
```python
train_rds = RemoteDataset(path='train_dataset.pt', data_type="torch_tensor")
train_rdl = RemoteDataLoader(remote_dataset=train_rds, batch_size=32)
train_rdl_ptr = train_rdl.send(client)
# call create_dataset to create the real Dataset object on remote side
train_rdl_ptr.load_dataset()
# call create_dataloader to create the real DataLoader object on remote side
train_rdl_ptr.create_dataloader()
```
Let’s loop through the remote data loader and see what’s inside. Note that I used `ic` from the icecream package to print out variables while debugging; it is quite handy.
```python
for i, b in enumerate(train_rdl_ptr):
    X, y = b[0], b[1]
    ic(X, y)
    ic(X.get_copy().shape, y.get_copy().shape)
    break
```
Using the code above, we would get `X` and `y` as pointers to the corresponding torch Tensors, but not the real tensors themselves, like in the figure below.

![](https://live.staticflickr.com/65535/51562317134_03b1f02085_c.jpg)

*Figure 2: output when looping through the remote data loader.*

The server can request to access the tensors by using `X.get()` or `X.get_copy()`, but this needs to be accepted by the client. Here, we assume that the client accepts all requests from the server for convenience. However, we will see in the training loop later that the client will never request to get access to the training input data. Furthermore, as we only loaded 50 examples, and the batch size is 32, there are only two batches, one with 32 samples, and one with 18 samples.
Similarly, the server makes the remote dataset and data loader for the test dataset.
```python
test_rds = RemoteDataset(path='test_dataset.pt', data_type="torch_tensor")
test_rdl = RemoteDataLoader(remote_dataset=test_rds, batch_size=32)
test_rdl_ptr = test_rdl.send(client)
# call create_dataset to create the real Dataset object on remote side
test_rdl_ptr.load_dataset()
# call create_dataloader to create the real DataLoader object on remote side
test_rdl_ptr.create_dataloader()
```
### Server: defining the split neural network architecture to train on the ECG dataset
Figure 3 below shows the architecture of the 1D CNN neural network used to train on the ECG dataset. The model on the client side contains two 1D convolution layers (we will learn about it more later) with Leaky Relu activation functions. Each conv layer is followed by a 1D Max Pooling operation. The server’s model contains two fully connected layers, followed by a softmax activation function. The loss function used is the cross-entropy loss.

![](https://live.staticflickr.com/65535/51562317124_43ed07fd3c_c.jpg)

*Figure 3: the split learning model architecture.*

Let’s learn a bit about the 1D convolution layer. It is simply a method that slides a weight kernel along one dimension. Figure 4 shows the 1D convolution vs. 2D convolution operation. 1D convolution is suitable for 1D data, such as time series that we have in the ECG signals. If you want to learn more about 1D, 2D and 3D convolution, <a href="https://towardsdatascience.com/understanding-1d-and-3d-convolution-neural-network-keras-9d8f76e29610" target="_blank">this blog post</a> offers very clear explanations.

![](https://live.staticflickr.com/65535/51561872338_45589f4fc2.jpg)

*Figure 4: 1D Convolution layer vs 2D Convolution layer*

Now we can move on and define the neural network models on the client side with the code below. It is a class that inherits from `syft.Module`. Note that in line number 3, we have `torch_ref` as an argument in the constructor, which we will pass `remote_torch` into later. All the layers are constructed using this `torch_ref` module.
```python
class EcgClient(sy.Module):
    # used by the data owners
    def __init__(self, torch_ref):
        super(EcgClient, self).__init__(torch_ref=torch_ref)
        self.conv1 = self.torch_ref.nn.Conv1d(1, 16, 7, padding=3)  # 128 x 16
        self.relu1 = self.torch_ref.nn.LeakyReLU()
        self.pool1 = self.torch_ref.nn.MaxPool1d(2)  # 64 x 16
        self.conv2 = self.torch_ref.nn.Conv1d(16, 16, 5, padding=2)  # 64 x 16
        self.relu2 = self.torch_ref.nn.LeakyReLU()
        self.pool2 = self.torch_ref.nn.MaxPool1d(2)  # 32 x 16
        # load initial weights
        checkpoint = torch.load("init_weight.pth")
        self.conv1.weight.data = checkpoint["conv1.weight"]
        self.conv1.bias.data = checkpoint["conv1.bias"]
        self.conv2.weight.data = checkpoint["conv2.weight"]
        self.conv2.bias.data = checkpoint["conv2.bias"]
    
    def forward(self, x):
        x = self.conv1(x)
        x = self.relu1(x)
        x = self.pool1(x)
        x = self.conv2(x)
        x = self.relu2(x)
        x = self.pool2(x)
        x = x.view(-1, 32 * 16)
        return x
```
The server model also inherits from `syft.Module`; its constructor still gets `torch_ref` as an argument, however, the layers are defined with the normal `torch.nn` module, as they are trained locally.
```python
class EcgServer(sy.Module):
    def __init__(self, torch_ref):
        super(EcgServer, self).__init__(torch_ref=torch_ref)
        self.linear3 = nn.Linear(32 * 16, 128)
        self.relu3 = nn.LeakyReLU() 
        self.linear4 = nn.Linear(128, 5)
        self.softmax4 = nn.Softmax(dim=1)
        
        checkpoint = torch.load("init_weight.pth")
        self.linear3.weight.data = checkpoint["linear3.weight"]
        self.linear3.bias.data = checkpoint["linear3.bias"]
        self.linear4.weight.data = checkpoint["linear4.weight"]
        self.linear4.bias.data = checkpoint["linear4.bias"]
        
    def forward(self, x):
        x = self.linear3(x)
        x = self.relu3(x)
        x = self.linear4(x)
        x = self.softmax4(x)
        return x
```
The server then sends the client’s model to the remote client side (line 2 in the code below).
```python
ecg_client = EcgClient(torch_ref=torch)
ecg_client_ptr = ecg_client.send(client)  # Send the client's model to the client
ecg_server = EcgServer(torch_ref=torch)
```

### Server and client: training and testing loop
Before the training and testing loop, we need to define some hyperparameters:
```python
total_batch = 414  # 32*414=13248. We have 13245 data samples

epoch = 400
criterion = nn.CrossEntropyLoss()
lr = 0.001

optim_client = remote_torch.optim.Adam(params=ecg_client_ptr.parameters(), lr=lr)
optim_server = torch.optim.Adam(params=ecg_server.parameters(), lr=lr)

seed = 0
np.random.seed(seed)
torch.manual_seed(seed)
torch.cuda.manual_seed(seed)
torch.cuda.manual_seed_all(seed) # if you are using multi-GPU.
torch.backends.cudnn.benchmark = False
torch.backends.cudnn.deterministic = True
remote_torch.manual_seed(seed)
```
Finally, let the fun begin. Below is the code for the training and testing loop:
```python
train_losses = list()
train_accs = list()
test_losses = list()
test_accs = list()
best_test_acc = 0  # best test accuracy
for e in range(epoch):
    print(f"Epoch {e+1} - train ", end='')
    
    train_loss = 0.0
    correct, total = 0, 0
    for i, batch in enumerate(train_rdl_ptr):
        x_ptr, y_gt_ptr = batch[0], batch[1]
        # ic(x.get_copy(), y.get_copy())
        # initialize all gradients to zero
        optim_server.zero_grad()
        optim_client.zero_grad()
        # compute and get the activation signals from the first half of the network
        activs_ptr = ecg_client_ptr(x_ptr)
        # the client sends the activation maps to the server
        activs = activs_ptr.clone().get(request_block=True)
        # the server continues the forward pass on the activation maps
        y_hat = ecg_server(activs)
        # the server asks to access ground truths in plain text
        y_gt = y_gt_ptr.get_copy()
        # calculates cross-entropy loss
        loss = criterion(y_hat, y_gt)
        train_loss += loss.item()
        correct += torch.sum(y_hat.argmax(dim=1) == y_gt).item()
        # backward propagation (calculating gradients of the loss w.r.t the weights)
        loss.backward()
        # send the gradients to the client
        client_grad_ptr = activs.grad.clone().send(client)
        # update the gradients of the client's model
        activs_ptr.backward(client_grad_ptr)
        # update the weights based on the gradients
        optim_client.step()
        optim_server.step()
        total += len(y_gt)

    train_losses.append(train_loss / total_batch)
    train_accs.append(correct / total)

    print(f'loss: {train_losses[-1]: .4f}, accuracy: {train_accs[-1]*100: 2f}')

    # testing
    with torch.no_grad():  
        test_loss = 0.0
        correct, total = 0, 0
        for i, batch in enumerate(test_rdl_ptr):
            x_ptr, y_gt_ptr = batch[0], batch[1]
            # forward pass
            activs_ptr = ecg_client_ptr(x_ptr)
            activs = activs_ptr.clone().get(request_block=True)
            y_hat = ecg_server(activs)
            # the server asks to access ground truths in plain text
            y_gt = y_gt_ptr.get_copy()
            # calculate test loss
            loss = criterion(y_hat, y_gt)
            test_loss += loss.item()
            correct += torch.sum(y_hat.argmax(dim=1) == y_gt).item()
            total += len(y_gt)

        test_losses.append(test_loss / total_batch)
        test_accs.append(correct / total)
        print(f'test_loss: {test_losses[-1]: .4f}, test_acc: {test_accs[-1]*100: 2f}')
        
    if test_accs[-1] > best_test_acc:
        best_test_acc = test_accs[-1]
```

In the forward pass, we first get the pointers to the batch data (line 12). After initializing all gradients to 0 (line 15, 16), the client’s model extracts the activation maps from the training input data (line 18). The server then asks to access these activation maps (line 20) and continues the forward pass (line 22). The server also asks for access to the ground truth output data (line 24) to calculate the loss (line 26).

In the backward pass, the server starts the backpropagation until the split layer (line 30), then sends the gradients to the client (line 32). Upon reception, the client continues the backpropagation and calculates his gradients (line 34). Finally, when all gradients of the loss function with respect to the weights are calculated, both the client and server can update the parameters.

In the testing loop for each epoch, we only need to do the forward pass and calculate the testing losses.

![](https://live.staticflickr.com/65535/51562551870_20ea5fbe80.jpg)

*Figure 5: the result of the training and testing loop*

Finally, after 400 epochs are over, we can print out the best test accuracy and plot the training/testing losses and accuracies, like in Figure 6 and 7. As we can see, the split learning 1D CNN method can achieve 98.85% accuracy on the test dataset after 351 epochs. Not bad at all.

![](https://live.staticflickr.com/65535/51561872278_75c29983ec_b.jpg)

*Figure 6: printing out the best test accuracy*

![](https://live.staticflickr.com/65535/51561872188_c59bd11230_b.jpg)

*Figure 7: training/testing losses and accuracies*

## Drawbacks and Future Directions
While the split learning method achieves promising results, there are several problems to be addressed. Firstly, the server still needs to access the ground truth output data to calculate the loss. To solve this problem, we can use the U-shaped split learning configuration[^3]. Secondly, the activation maps sent from the client to the server can still leak information about the input training data. The authors from[^1] have experimented with differential privacy to solve this problem, however, it hinders greatly the accuracies of the algorithm. Thirdly, the time needed to train the split network using PySyft is very long, almost 14 hours on Intel Xeon CPU 2.60GHz and 6 cores. Training the same network locally with GPU only takes a few minutes. For now, PySyft has not supported training on GPU. Tackling these problems will be the focus of future works.

## Conclusions
In this blog post, we walked through the process of training a split 1D CNN model on the ECG dataset. Employing the split learning architecture, the algorithm can predict heart abnormalities up to 98,85% accurately while keeping the heartbeat data of the patients private. Thank you for reading, I hope you find something useful. See you in other blog posts on Secure and Private AI.

## References
[^1]: Sharif Abuadbba et al., Can We Use Split Learning on 1D CNN Models for Privacy Preserving Training? (2020), ACM ASIA Conference on Computer and Communications Security (ACM ASIACCS 2020)
[^2]: Moody GB, Mark RG. The impact of the MIT-BIH Arrhythmia Database (2001), IEEE Eng in Med and Biol 20(3):45–50 (May-June 2001)
[^3]: Praneeth Vepakomma et al., Split learning for health: Distributed deep learning without sharing raw patient data (2018)