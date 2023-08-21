import { xKZA, Convert, Redeem, CancelRedeem, FinalizeRedeem } from '../../../generated/xKZA/xKZA';
import { RedeemInfo, UserXKZA } from '../../../generated/schema';
import { getOrInitUserXKZA, getOrInitXKZA } from '../../helpers/v3/initializers';
import { store, BigInt, log } from '@graphprotocol/graph-ts';

export function handleXKZAConvert(event: Convert): void {
  // let xkza = getOrInitXKZA();
  // xkza.totalSupply = xkza.totalSupply.plus(event.params.amount);
  // xkza.save();

  let userxkza = getOrInitUserXKZA(event.params.to.toHexString());
  userxkza.balance = userxkza.balance.plus(event.params.amount);
  userxkza.save();
}

export function handleXKZARedeem(event: Redeem): void {
  // let xkza = getOrInitXKZA();
  // xkza.totalSupply = xkza.totalSupply.minus(event.params.xAmount);
  // xkza.save();

  let userAddress = event.params.userAddress;
  let xkzaAmount = event.params.xAmount;

  let userxkza = getOrInitUserXKZA(userAddress.toHexString());
  userxkza.balance = userxkza.balance.minus(xkzaAmount);
  userxkza.save();

  // read contract
  const xkza = xKZA.bind(event.address);
  const realLength = xkza.getUserRedeemsLength(userAddress);

  // read db
  // const redeemInfos = userxkza.redeems.load();
  // log.info('userRedeemIndex 1: {}', [redeemInfos.length.toString()]);
  const userRedeemIndex = realLength.toI32() - 1;
  // log.info('userRedeemIndex 2: {}', [userRedeemIndex.toString()]);

  let redeemInfo = new RedeemInfo(
    userAddress.toHexString() + event.transaction.hash.toHexString() + event.logIndex.toString()
  );
  redeemInfo.userXKZA = userxkza.id;
  redeemInfo.xkzaAmount = xkzaAmount;
  redeemInfo.kzaAmount = event.params.amount;
  redeemInfo.endTime = event.params.duration.toI32() + event.block.timestamp.toI32();
  redeemInfo.userRedeemIndex = userRedeemIndex;
  redeemInfo.status = 'Pending';
  redeemInfo.save();
}

function removeUserRedeemInfoByIndex(
  userxkza: UserXKZA,
  xkzaAmount: BigInt,
  userRedeemIndex: i32,
  status: string
): void {
  userxkza.balance = userxkza.balance.minus(xkzaAmount);
  userxkza.save();

  const redeemInfos = userxkza.redeems.load();
  log.info('redeemInfos.length: {}', [redeemInfos.length.toString()]);
  if (redeemInfos.length == 0) {
    throw new Error('redeemInfos.length == 0');
  }
  // const realLength = xkza.getUserRedeemsLength(userAddress);

  let isLast = userRedeemIndex == redeemInfos.length - 1;

  for (let index = 0; index < redeemInfos.length; index++) {
    const element = redeemInfos[index];
    if (element.userRedeemIndex == userRedeemIndex) {
      // remove the RedeemInfo
      element.status = status;
      element.save();
      // store.remove('RedeemInfo', element.id);
      log.info('remove RedeemInfo: {}', [element.id]);
    }
    if (!isLast && element.userRedeemIndex == redeemInfos.length - 1) {
      element.userRedeemIndex = userRedeemIndex;
      element.save();
    }
  }

  // const newLength = userxkza.redeems.load().length;
  // log.info('newLength: {}', [newLength.toString()]);

  // if (newLength != redeemInfos.length - 1) {
  //   throw new Error('remove userRedeemInfo error');
  // }
}

export function handleXKZARedeemCancel(event: CancelRedeem): void {
  let userAddress = event.params.userAddress.toHexString();
  let xkzaAmount = event.params.xAmount;
  const userRedeemIndex = event.params.index.toI32();
  let userxkza = getOrInitUserXKZA(userAddress);

  // removeUserRedeemInfoByIndex(userxkza, xkzaAmount, userRedeemIndex, 'Canceled');
}

export function handleXKZARedeemFinalize(event: FinalizeRedeem): void {
  let userAddress = event.params.userAddress.toHexString();
  let xkzaAmount = event.params.xAmount;
  const userRedeemIndex = event.params.index.toI32();
  let userxkza = getOrInitUserXKZA(userAddress);

  // removeUserRedeemInfoByIndex(userxkza, xkzaAmount, userRedeemIndex, 'Finalized');
}
