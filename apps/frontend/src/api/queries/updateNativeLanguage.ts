import { apiRequest } from '../apiRequest';
import type { NativeLanguage } from '../types/language';
import type { User } from '../types/user';

export const updateNativeLanguage = (nativeLanguage: NativeLanguage): Promise<User> =>
  apiRequest<User>('/users/me', { method: 'PATCH', body: { nativeLanguage } });
