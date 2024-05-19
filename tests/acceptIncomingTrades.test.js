const SteamUser = require('steam-user');
const SteamCommunity = require('steamcommunity');
const TradeOfferManager = require('../lib/index.js');
const FS = require('fs');

jest.mock('fs');
jest.mock('steam-user');
jest.mock('steamcommunity');

describe('Storehouse - node-steam', () => {
  let client;
  let manager;
  let community;

  beforeEach(() => {
    client = new SteamUser();
    manager = new TradeOfferManager({
      "steam": client,
      "domain": "example.com",
      "language": "en"
    });
    community = new SteamCommunity();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should accept offer where only receiving items', () => {
    const mockOffer = {
      id: 123456,
      partner: { getSteam3RenderedID: jest.fn(() => '[U:1:12345]') },
      getExchangeDetails: jest.fn((callback) => {
        callback(null, 'accepted', Date.now(), [{ new_assetid: 1234 }], []);
      }),
      accept: jest.fn((callback) => {
        callback(null, 'pending');
      })
    };

    const communityMock = {
      acceptConfirmationForObject: jest.fn((secret, offerId, callback) => {
        callback(null);
      })
    };

    jest.spyOn(manager, 'on').mockImplementation((event, callback) => {
      if (event === 'newOffer') {
        callback(mockOffer);
      }
    });

    jest.spyOn(SteamCommunity.prototype, 'instance').mockReturnValue(communityMock);

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    manager.on('newOffer', manager.on.mock.calls[0][1]);

    expect(logSpy).toHaveBeenCalledWith('New offer #123456 from [U:1:12345]');
    expect(logSpy).toHaveBeenCalledWith('Offer accepted: pending');
    expect(logSpy).toHaveBeenCalledWith('Trade offer 123456 confirmed');
    expect(mockOffer.accept).toHaveBeenCalled();
    expect(communityMock.acceptConfirmationForObject).toHaveBeenCalledWith('identitySecret', 123456, expect.any(Function));
  });
});