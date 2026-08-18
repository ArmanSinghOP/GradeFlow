import math
from dataclasses import dataclass
from collections import Counter
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import normalize
from app.core.logging import get_logger

logger = get_logger(__name__)

BRIDGE_BOUNDARY_PERCENTILE = 10

@dataclass
class ClusterResult:
    cluster_labels: list[int]
    bridge_flags: list[bool]
    k: int
    cluster_sizes: dict[int, int]

def compute_clusters(embeddings: list[list[float]], min_cluster_size: int = 10, max_cluster_size: int = 50) -> list[int]:
    """Compute k-means clustering on embeddings."""
    n = len(embeddings)
    logger.info(f"Computing clusters for {n} embeddings")
    
    if n == 0:
        return []
        
    X = np.array(embeddings)
    X_norm = normalize(X, norm='l2', axis=1)
    
    k = max(1, round(n / 25))
    k = min(k, n)
    
    logger.debug(f"Targeting k={k} clusters for n={n}")
    
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = kmeans.fit_predict(X_norm)
    
    logger.info(f"Successfully computed {k} clusters")
    return labels.tolist()

def detect_bridge_essays(embeddings: list[list[float]], cluster_labels: list[int]) -> list[bool]:
    """Detect bridge essays based on distance to cluster centroids."""
    n = len(embeddings)
    logger.info(f"Detecting bridge essays for {n} embeddings")
    
    if n == 0:
        return []
        
    if len(set(cluster_labels)) < 2:
        logger.debug("Less than 2 clusters found, returning all False for bridge essays")
        return [False] * n

    X = np.array(embeddings)
    X_norm = normalize(X, norm='l2', axis=1)
    
    unique_labels = sorted(list(set(cluster_labels)))
    centroids = {}
    for label in unique_labels:
        mask = np.array(cluster_labels) == label
        cluster_points = X_norm[mask]
        centroid = np.mean(cluster_points, axis=0)
        # Re-normalize centroid since mean of normalized vectors isn't necessarily normalized
        centroids[label] = normalize(centroid.reshape(1, -1), norm='l2', axis=1)[0]
    
    ratios = []
    
    for i, emb in enumerate(X_norm):
        own_label = cluster_labels[i]
        own_centroid = centroids[own_label]
        
        dist_own = np.linalg.norm(emb - own_centroid)
        
        dist_others = []
        for label, centroid in centroids.items():
            if label != own_label:
                dist_others.append(np.linalg.norm(emb - centroid))
                
        dist_nearest_other = min(dist_others) if dist_others else 1.0
        
        # Guard against zero division
        if dist_nearest_other == 0:
            ratio = float('inf')
        else:
            ratio = dist_own / dist_nearest_other
            
        ratios.append(ratio)
        
    threshold = np.percentile(ratios, 100 - BRIDGE_BOUNDARY_PERCENTILE)
    
    bridge_flags = [bool(r > threshold) for r in ratios]
    
    # Cap to max 20%
    true_indices = [i for i, flag in enumerate(bridge_flags) if flag]
    max_bridges = int(n * 0.20)
    
    if len(true_indices) > max_bridges:
        logger.debug(f"Capping bridge essays from {len(true_indices)} to {max_bridges}")
        # Sort by ratio descending to keep the most boundary ones
        true_indices_sorted = sorted(true_indices, key=lambda idx: ratios[idx], reverse=True)
        keep_indices = set(true_indices_sorted[:max_bridges])
        bridge_flags = [i in keep_indices for i in range(n)]

    logger.info(f"Identified {sum(bridge_flags)} bridge essays")
    return bridge_flags
