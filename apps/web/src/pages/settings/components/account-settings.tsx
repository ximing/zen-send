import { useState, useRef, useEffect } from 'react';
import { observer, useService } from '@rabjs/react';
import { Camera } from 'lucide-react';
import { AuthService } from '../../../services/auth.service';
import { UserService } from '../../../services/user.service';
import { ToastService } from '../../../components/toast/toast.service';

function AccountSettingsInner() {
  const authService = useService(AuthService);
  const userService = useService(UserService);
  const toastService = useService(ToastService);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const user = authService.user;
  const [nickname, setNickname] = useState(user?.nickname || user?.email?.split('@')[0] || '');
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    userService.getProfile().catch(console.error);
  }, []);

  const handleSaveNickname = async () => {
    setIsSavingNickname(true);
    try {
      await userService.updateProfile({ nickname });
    } catch (err) {
      console.error('Failed to save nickname:', err);
    } finally {
      setIsSavingNickname(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toastService.show('File size must be less than 10MB', 'warning');
      return;
    }
    setIsUploadingAvatar(true);
    try {
      await userService.uploadAvatar(file);
    } catch (err) {
      console.error('Failed to upload avatar:', err);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await userService.updateProfile({ removeAvatar: true });
    } catch (err) {
      console.error('Failed to remove avatar:', err);
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6">
      {/* Avatar Section */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt="Avatar"
              className="w-24 h-24 rounded-full object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-[var(--accent-soft)] flex items-center justify-center">
              <span className="text-4xl font-semibold text-[var(--accent)]">
                {user?.email?.charAt(0).toUpperCase() ?? '?'}
              </span>
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingAvatar}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            <Camera size={16} />
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleAvatarChange}
          className="hidden"
        />
        {user?.avatarUrl && (
          <button
            onClick={handleRemoveAvatar}
            className="mt-3 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            Remove avatar
          </button>
        )}
        {isUploadingAvatar && (
          <span className="mt-2 text-sm text-[var(--text-muted)]">Uploading...</span>
        )}
      </div>

      {/* Nickname Section */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[var(--text-secondary)]">昵称</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={user?.email?.split('@')[0] || '输入昵称'}
            maxLength={50}
            className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
          <button
            onClick={handleSaveNickname}
            disabled={isSavingNickname}
            className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSavingNickname ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {/* Email (read-only) */}
      <div className="mt-6 space-y-2">
        <label className="block text-sm font-medium text-[var(--text-secondary)]">邮箱</label>
        <div className="px-3 py-2 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-muted)] text-sm">
          {user?.email ?? ''}
        </div>
      </div>
    </div>
  );
}

export default observer(AccountSettingsInner);
