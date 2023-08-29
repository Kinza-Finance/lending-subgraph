import { Voted, Abstained, MarketBribeCreated } from '../../../generated/Voter/Voter';
import { VoteMarket, UserVote, VoteBribeInfo } from '../../../generated/schema';
import { AggregateBribe } from '../../../generated/templates';
// import { getOrInitUserXKZA, getOrInitXKZA } from '../../helpers/v3/initializers';
import { Bytes, BigInt, log } from '@graphprotocol/graph-ts';
import { getProtocol, getOrInitVoter } from '../../helpers/v3/initializers';
import { getReserveId } from '../../utils/id-generation';

export function handleVoted(event: Voted): void {
  const user = event.params.voter.toHexString();
  const pool = event.params.pool.toHexString();
  const weight = event.params.weight;
  const epoch = event.params.epoch;
  const lastUpdateTimestamp = event.block.timestamp.toI32();

  log.info('Voted: {} {} {} {}', [user, pool, weight.toString(), epoch.toString()]);

  let userVote = UserVote.load(pool + user);
  if (userVote == null) {
    userVote = new UserVote(pool + user);
    userVote.pool = pool;
    userVote.user = user;
    userVote.weight = weight;
    userVote.epoch = epoch.toI32();
    userVote.lastUpdateTimestamp = lastUpdateTimestamp;
    userVote.save();
  } else {
    userVote.weight = weight;
    userVote.epoch = epoch.toI32();
    userVote.lastUpdateTimestamp = lastUpdateTimestamp;
    userVote.save();
  }
  const voteMarket = VoteMarket.load(pool);
  if (voteMarket == null) {
    log.error('No vote market found for pool {}', [pool]);
    throw new Error('No vote market found for pool ' + pool);
  }
  voteMarket.weight = voteMarket.weight.plus(weight);
  voteMarket.lastUpdateTimestamp = lastUpdateTimestamp;
  voteMarket.save();
}

export function handleAbstained(event: Abstained): void {
  const user = event.params.voter.toHexString();
  // const weight = event.params.weight;
  // const epoch = event.params.epoch;

  const voter = getOrInitVoter();

  const voteMarkets = voter.markets.load();
  if (voteMarkets.length == 0) {
    log.error('No vote markets found for voter {}', [user]);
    throw new Error('No vote markets found for voter ' + user);
  }

  for (let i = 0; i < voteMarkets.length; i++) {
    const voteMarket = voteMarkets[i];
    const pool = voteMarket.id;
    let userVote = UserVote.load(pool + user);
    if (userVote != null) {
      const weight = userVote.weight;
      if (weight.gt(BigInt.fromI32(0))) {
        if (voteMarket.weight.lt(weight)) {
          log.error(
            'Vote market weight is less than user vote weight for pool {}, pool weight {}, user weight {}',
            [pool, voteMarket.weight.toString(), weight.toString()]
          );
          throw new Error('Vote market weight is less than user vote weight for pool ' + pool);
        }
        voteMarket.weight = voteMarket.weight.minus(weight);
        voteMarket.save();
        userVote.weight = BigInt.fromI32(0);
        userVote.save();
        log.info('Abstained: {} {} {}', [pool, user, weight.toString()]);
      }
    }
  }
}

export function handleMarketBribeCreated(event: MarketBribeCreated): void {
  const underlyingAssetAddress = event.params.market.toHexString();
  const bribeAddress = event.params.bribe.toHexString();

  const protocol = getProtocol();
  const pool = protocol.pools.load()[0];
  log.info('pool: {}', [pool.id]);

  const voter = getOrInitVoter();

  const reserveId = getReserveId(Bytes.fromHexString(underlyingAssetAddress), pool.id);

  let voteMarket = VoteMarket.load(underlyingAssetAddress);
  if (voteMarket == null) {
    voteMarket = new VoteMarket(underlyingAssetAddress);
    voteMarket.bribe = bribeAddress;
    voteMarket.weight = BigInt.fromI32(0);
    voteMarket.reserve = reserveId;
    voteMarket.voter = voter.id;
    voteMarket.save();
  }
  let bribeInfo = VoteBribeInfo.load(bribeAddress);
  if (bribeInfo == null) {
    bribeInfo = new VoteBribeInfo(bribeAddress);
    bribeInfo.underlyingAsset = underlyingAssetAddress;
    bribeInfo.voteMarket = voteMarket.id;
    bribeInfo.save();
    AggregateBribe.create(event.params.bribe);
  }
}
