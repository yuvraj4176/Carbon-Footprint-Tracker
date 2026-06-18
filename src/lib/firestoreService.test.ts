import { vi } from 'vitest';
import { 
  saveUserDoc, getUserDoc, saveProfileDoc, getProfileDoc, 
  savePledgesDoc, getPledgesDoc, saveAIAnalysisDoc, getAIAnalysisDoc 
} from './firestoreService';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Mock Firebase
vi.mock('./firebase', () => ({
  auth: { currentUser: null },
  db: {}
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn()
}));

describe('firestoreService', () => {
  const mockUid = 'test-uid';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('UserDoc', () => {
    it('saves user doc successfully', async () => {
      (setDoc as any).mockResolvedValueOnce(undefined);
      const data = { email: 'test@example.com', name: 'Test', createdAt: '2026', targetGoalTons: 4 };
      
      await saveUserDoc(mockUid, data);
      
      expect(doc).toHaveBeenCalledWith(expect.anything(), 'users', mockUid);
      expect(setDoc).toHaveBeenCalledWith(undefined, {
        email: data.email,
        name: data.name,
        createdAt: data.createdAt,
        targetGoalTons: data.targetGoalTons
      });
    });

    it('gets user doc successfully', async () => {
      const mockData = { email: 'test@example.com' };
      (getDoc as any).mockResolvedValueOnce({
        exists: () => true,
        data: () => mockData
      });

      const result = await getUserDoc(mockUid);
      
      expect(result).toEqual(mockData);
    });

    it('returns null if user doc does not exist', async () => {
      (getDoc as any).mockResolvedValueOnce({
        exists: () => false
      });

      const result = await getUserDoc(mockUid);
      
      expect(result).toBeNull();
    });
  });

  describe('ProfileDoc', () => {
    it('saves profile doc successfully', async () => {
      (setDoc as any).mockResolvedValueOnce(undefined);
      const data: any = { carMilesPerWeek: 100 };
      
      await saveProfileDoc(mockUid, data);
      
      expect(doc).toHaveBeenCalledWith(expect.anything(), 'users', mockUid, 'configs', 'profile');
      expect(setDoc).toHaveBeenCalledWith(undefined, data);
    });

    it('gets profile doc successfully', async () => {
      const mockData = { carMilesPerWeek: 100 };
      (getDoc as any).mockResolvedValueOnce({
        exists: () => true,
        data: () => mockData
      });

      const result = await getProfileDoc(mockUid);
      
      expect(result).toEqual(mockData);
    });
  });

  describe('PledgesDoc', () => {
    it('saves pledges doc successfully', async () => {
      (setDoc as any).mockResolvedValueOnce(undefined);
      const data: any = [{ id: '1', title: 'Test' }];
      
      await savePledgesDoc(mockUid, data);
      
      expect(doc).toHaveBeenCalledWith(expect.anything(), 'users', mockUid, 'configs', 'pledges');
      expect(setDoc).toHaveBeenCalledWith(undefined, { pledges: data });
    });

    it('gets pledges doc successfully', async () => {
      const mockData = [{ id: '1', title: 'Test' }];
      (getDoc as any).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ pledges: mockData })
      });

      const result = await getPledgesDoc(mockUid);
      
      expect(result).toEqual(mockData);
    });
  });

  describe('AIAnalysisDoc', () => {
    it('saves AI analysis doc successfully', async () => {
      (setDoc as any).mockResolvedValueOnce(undefined);
      const data: any = { coachFeedback: 'Good' };
      
      await saveAIAnalysisDoc(mockUid, data);
      
      expect(doc).toHaveBeenCalledWith(expect.anything(), 'users', mockUid, 'configs', 'ai_analysis');
      expect(setDoc).toHaveBeenCalledWith(undefined, data);
    });

    it('gets AI analysis doc successfully', async () => {
      const mockData = { coachFeedback: 'Good' };
      (getDoc as any).mockResolvedValueOnce({
        exists: () => true,
        data: () => mockData
      });

      const result = await getAIAnalysisDoc(mockUid);
      
      expect(result).toEqual(mockData);
    });
  });
});
