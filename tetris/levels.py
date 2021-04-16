import matplotlib.pyplot as plt
from scipy.optimize import curve_fit
import numpy as np

level_data = [
    [18.0],
    [13.27, 13.65, 13.60],
    [10.65, 10.86, 10.68],
    [8.56, 8.81, 8.68, 8.60],
    [6.83, 6.90, 6.54]
]
level_data = [np.mean(l)/20.0 for l in level_data]

levels = range(len(level_data))
levels = [l+1 for l in levels]

def exp(l, a, b):
    return a*(b**(-l))

par, cov = curve_fit(exp, levels, level_data)
print(*par)

intr = np.linspace(0, 15, 100)
plt.plot(intr, [exp(x, *par) for x in intr])

plt.plot(levels, level_data, linestyle="none", marker="+")
plt.ylim(0, 1.0)
plt.xlim(0, 15)
plt.show()
