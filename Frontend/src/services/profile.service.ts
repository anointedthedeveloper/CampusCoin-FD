import { profileApi } from '@/api/profile.api';
import type { OnboardingUpdate, User, UserProfileUpdate, UserSettings } from '@/types/user';

export const profileService = {
  async getProfile(): Promise<User> {
    return profileApi.getProfile();
  },

  async updateProfile(payload: UserProfileUpdate): Promise<User> {
    return profileApi.updateProfile(payload);
  },

  async updateOnboarding(payload: OnboardingUpdate): Promise<User> {
    return profileApi.updateOnboarding(payload);
  },

  async getSettings(): Promise<UserSettings> {
    return profileApi.getSettings();
  },

  async updateSettings(payload: Partial<UserSettings>): Promise<UserSettings> {
    return profileApi.updateSettings(payload);
  },
};
