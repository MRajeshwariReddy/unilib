---
title: CS 101 Lecture Notes - Introduction to Neural Networks
course: CS 101
author: Alex Student
---

# Introduction to Neural Networks

Artificial neural networks (ANNs) are computing systems inspired by the biological neural networks that constitute animal brains.

## Key Components

* Neurons (Nodes): Receive inputs, combine them, perform a non-linear operation, and pass the output.
* Weights and Biases: Learnable parameters adjusted during training.
* Activation Functions: Introduce non-linearity into the network.

## Common Activation Functions

1. ReLU (Rectified Linear Unit): $f(x) = \max(0, x)$
2. Sigmoid: $\sigma(x) = \frac{1}{1 + e^{-x}}$
3. Softmax: Used for multi-class classification output layers.

```python
import numpy as np

def relu(x):
    return np.maximum(0, x)
```

> "Deep learning allows computational models composed of multiple processing layers to learn representations of data with multiple levels of abstraction." — Yann LeCun
