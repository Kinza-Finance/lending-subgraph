import { NotifyReward } from '../../../generated/templates/AggregateBribe/AggregateBribe'
import { BribeTokenRewardPerEpoch, BribeTokenRewardInfo } from '../../../generated/schema'

export function handleNotifyReward(event: NotifyReward): void {
  const reward = event.params.reward;
  const epochTimestamp = event.params.epoch;
  const amount = event.params.amount;
  const bribeAddress = event.address;
  const bribeId = bribeAddress.toHexString() + reward.toHexString();
  let bribeTokenRewardInfo = BribeTokenRewardInfo.load(bribeId)
  if (bribeTokenRewardInfo == null) {
    bribeTokenRewardInfo = new BribeTokenRewardInfo(bribeId)
    bribeTokenRewardInfo.bribe = bribeAddress.toHexString();
    bribeTokenRewardInfo.rewardtokenAddress = reward.toHexString();
    bribeTokenRewardInfo.latestEpochTimestamp = epochTimestamp.toI32();
    bribeTokenRewardInfo.save()
  } else if (bribeTokenRewardInfo.latestEpochTimestamp < epochTimestamp.toI32()) {
    bribeTokenRewardInfo.latestEpochTimestamp = epochTimestamp.toI32();
    bribeTokenRewardInfo.save()
  }

  const rewardPerEpockId = bribeId + epochTimestamp.toString();
  let bribeTokenRewardPerEpoch = BribeTokenRewardPerEpoch.load(rewardPerEpockId)
  if (bribeTokenRewardPerEpoch == null) {
    bribeTokenRewardPerEpoch = new BribeTokenRewardPerEpoch(rewardPerEpockId)
    bribeTokenRewardPerEpoch.bribeTokenRewardInfo = bribeId;
    bribeTokenRewardPerEpoch.amount = amount;
    bribeTokenRewardPerEpoch.epochTimestamp = epochTimestamp.toI32();
    bribeTokenRewardPerEpoch.save()
  } else {
    bribeTokenRewardPerEpoch.amount = bribeTokenRewardPerEpoch.amount.plus(amount);
    bribeTokenRewardPerEpoch.save()
  }
}
