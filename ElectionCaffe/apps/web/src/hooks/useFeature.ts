import { useQuery } from '@tanstack/react-query';
import { organizationAPI } from '../services/api';

/**
 * Hook to check if a feature is enabled for the current tenant
 * @param featureKey - The feature key to check (e.g., 'fund_management', 'inventory_management')
 * @returns Object containing feature status and loading state
 */
export function useFeature(featureKey: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['my-features'],
    queryFn: () => organizationAPI.getMyFeatures(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });

  const responseData = data?.data?.data;
  const features = responseData?.features || [];
  const enabledFeatures = responseData?.enabledFeatures || {};

  // Try to find in the features array first (new format)
  const feature = features.find((f: any) => f.featureKey === featureKey);
  // Fall back to the enabledFeatures map (legacy format)
  const isEnabled = feature ? feature.isEnabled : (enabledFeatures[featureKey] || false);

  return {
    isEnabled,
    isLoading,
    feature,
  };
}

/**
 * Hook to check multiple features at once
 * @param featureKeys - Array of feature keys to check
 * @returns Object containing enabled features and loading state
 */
export function useFeatures(featureKeys: string[]) {
  const { data, isLoading } = useQuery({
    queryKey: ['my-features'],
    queryFn: () => organizationAPI.getMyFeatures(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const responseData = data?.data?.data;
  const features = responseData?.features || [];
  const enabledFeaturesMap = responseData?.enabledFeatures || {};
  const enabledFeatures: Record<string, boolean> = {};

  featureKeys.forEach((key) => {
    // Try to find in the features array first (new format)
    const feature = features.find((f: any) => f.featureKey === key);
    // Fall back to the enabledFeatures map (legacy format)
    enabledFeatures[key] = feature ? feature.isEnabled : (enabledFeaturesMap[key] || false);
  });

  return {
    enabledFeatures,
    isLoading,
    features,
  };
}
