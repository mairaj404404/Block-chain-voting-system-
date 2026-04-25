import CryptoJS from 'crypto-js';
import { Vote } from './types';

export function calculateHash(vote: Partial<Vote>): string {
  const { electionId, userId, optionId, timestamp, previousHash, blockIndex } = vote;
  const t = timestamp?.seconds || timestamp || Date.now();
  return CryptoJS.SHA256(
    `${electionId}${userId}${optionId}${t}${previousHash}${blockIndex}`
  ).toString();
}

export const GENESIS_HASH = "0".repeat(64);

export function verifyChain(votes: Vote[]): boolean {
  for (let i = 1; i < votes.length; i++) {
    const currentVote = votes[i];
    const previousVote = votes[i - 1];

    if (currentVote.previousHash !== previousVote.hash) {
      return false;
    }

    if (currentVote.hash !== calculateHash(currentVote)) {
      return false;
    }
  }
  return true;
}
