data = "l r p g o y b r p y l b o g p r y l b g o y p l g o r b l b g o p r y b l y r p o g p o r g b l y l g y r p b o b g l y p o r l g y o b p r p b o g y l r l p o g b y r y b l g p r o g o b r l y p o g r b p y l o g l y b p r o l r g p y b p l y g o r y r g y b l p l o r b y p g p l r b y o g b o r l g y y g o r l p b b g l y p o r p l g r b y o o g r p l y b r b p g y o l y l o p b g r o g r b y l p p g r b l y o y p r b o l g p y b l o r g b y g r p l o b o p l r y g g p b o r y b b r p y l g p l r g b y o y p g o l r b y o p r g b l b g p l o r y r l o b"

import numpy as np
import matplotlib.pyplot as plt

nums = {}
nums["l"] = 0
nums["r"] = 1
nums["p"] = 2
nums["g"] = 3
nums["o"] = 4
nums["y"] = 5
nums["b"] = 6

data = [nums[d] for d in data.split()]

for i in range(0, len(data), 7):
    d = {}
    for n in data[i:i+7]:
        d[n] = 1

    print(data[i:i+7])
    print([n for n in d])

matrix = np.zeros((7,7))

for i in range(len(data)-1):
    matrix[data[i], data[i+1]] += 1

plt.imshow(matrix)
plt.colorbar()
plt.show()
