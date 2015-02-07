describe('SyncedDB', function() {
  var stores = {
    animals: [
      ['byColor', 'color'],
      ['byName', 'name', {unique: true}],
    ],
    roads: [
      ['byLength', 'length'],
    ],
    houses: [
      ['byStreet', 'street'],
    ],
  };
  afterEach(function(done) {
    var req = indexedDB.deleteDatabase('mydb');
    req.onblocked = function () { console.log('Delete was blocked'); };
    req.onsuccess = function() { done(); };
  });
  describe('Opening a database', function() {
    var db;
    beforeEach(function() {
      db = syncedDB.open({name: 'mydb', version: 1, stores: stores});
    });
    it('return promise resolved with db and event', function(done) {
      syncedDB.open({name:'mydb', version: 1, stores: []}).then(function(res) {
        assert(res.db.db instanceof IDBDatabase);
        assert(res.e.type === 'success');
        done();
      });
    });
    it('creates database with specified version', function(done) {
      var spy = sinon.spy();
      syncedDB.open({name:'mydb', version: 1, stores: []}).then(function() {
        var req = indexedDB.open('mydb', 1);
        req.onupgradeneeded = spy;
        req.onsuccess = function() {
          var db = req.result;
          assert(spy.notCalled);
          db.close();
          done();
        };
      });
    });
    it('creates object stores', function(done) {
      db.then(function() {
        var req = indexedDB.open('mydb', 1);
        req.onsuccess = function() {
          var db = req.result;
          var stores = db.objectStoreNames;
          assert(stores.length === 4);
          assert(stores.contains('animals'));
          assert(stores.contains('roads'));
          assert(stores.contains('houses'));
          db.close();
          done();
        };
      });
    });
    it('handles object store parameters', function(done) {
      db.then(function() {
        var req = indexedDB.open('mydb', 1);
        req.onsuccess = function() {
          var db = req.result;
          var tx = db.transaction(['animals', 'houses', 'roads']);
          var animals = tx.objectStore('animals');
          var roads = tx.objectStore('roads');
          var houses = tx.objectStore('houses');
          assert.equal(animals.keyPath, 'key');
          assert.equal(animals.autoIncrement, false);
          assert(roads.keyPath === 'key');
          assert(roads.autoIncrement === false);
          assert(houses.keyPath === 'key');
          assert(houses.autoIncrement === false);
          db.close();
          done();
        };
      });
    });
    it('creates indexes ', function(done) {
      db.then(function() {
        var req = indexedDB.open('mydb', 1);
        req.onsuccess = function() {
          var db = req.result;
          var tx = db.transaction(['animals', 'roads']);

          var animals = tx.objectStore('animals');
          var byColor = animals.index('byColor');
          var byName = animals.index('byName');
          var roads = tx.objectStore('roads');
          var byLength = roads.index('byLength');

          assert(byColor.keyPath === 'color');
          assert(!byColor.unique);
          assert(byName.keyPath === 'name');
          assert(byName.unique);
          assert(byLength.keyPath === 'length');
          assert(!byLength.unique);

          db.close();
          done();
        };
      });
    });
    it('handles migrations with added stores', function(done) {
      db.then(function() {
        var stores2 = {animals: stores.animals, roads: stores.roads, houses: stores.houses};
        stores2.books = [['byAuthor', 'author']];
        return syncedDB.open({name: 'mydb', version: 2, stores: stores2});
      }).then(function() {
        done();
      });
    });
    it('handles migrations with added indexes', function(done) {
      var stores2 = {
        animals: [
          ['byColor', 'color'],
          ['byName', 'name'],
          ['bySpecies', 'species'], // New
        ],
        roads: [
          ['byLength', 'length'],
          ['byCost', 'cost'], // New
        ],
        houses: [
          ['byStreet', 'street'],
        ]
      };
      db.then(function() {
        return syncedDB.open({name: 'mydb',
                              version: 2,
                              stores: stores2});
      }).then(function() {
        done();
      });
    });
    it('calls migration hooks with db and e', function(done) {
      var m1 = sinon.spy();
      var m2 = sinon.spy();
      var m3 = sinon.spy();
      var migrations = {
        1: m1,
        2: m2,
        3: m3,
      };
      syncedDB.open({name: 'another', version: 1,
                    stores: stores, migrations: migrations})
      .then(function() {
        assert(m1.firstCall.args[0] instanceof IDBDatabase);
        assert(m1.firstCall.args[1].type === 'upgradeneeded');
        assert(m2.notCalled);
        assert(m3.notCalled);
        return syncedDB.open({name: 'another', version: 3,
                              stores: stores, migrations: migrations});
      }).then(function() {
        assert(m2.calledOnce);
        assert(m3.calledOnce);
        assert(m3.firstCall.args[0] instanceof IDBDatabase);
        assert(m3.firstCall.args[1].type === 'upgradeneeded');
        var req = indexedDB.deleteDatabase('another');
        req.onsuccess = function() { done(); };
      });
    });
  });
  describe('Database', function() {
    it('is exposes stores', function(done) {
      var db = syncedDB.open({name: 'mydb', version: 1, stores: stores});
      db.then(function(db) {
        done();
      });
      assert(typeof db.animals === 'object');
      assert(typeof db.stores.animals === 'object');
      assert(typeof db.animals.byColor === 'object');
      assert(typeof db.animals.byName === 'object');
      assert(typeof db.stores.roads === 'object');
      assert(typeof db.roads.byLength === 'object');
      assert(typeof db.stores.houses === 'object');
    });
  });
  describe('Transaction', function() {
    var db;
    beforeEach(function() {
      db = syncedDB.open({name: 'mydb', version: 1, stores: stores});
    });
    it('gives requested stores', function(done) {
      db.read('roads', 'houses', function(roads, houses) {
        assert(roads);
        assert(houses);
      }).then(function() {
        done();
      });
    });
    it('can put and get', function(done) {
      var road = {length: 100, price: 1337};
      var house = {street: 'Somewhere', built: 1891};
      db.write('roads', 'houses', function(roads, houses) {
        roads.put(road);
        houses.put(house);
      }).then(function() {
        return db.houses.get(house.key);
      }).then(function(somewhere) {
        assert.equal(somewhere.built, 1891);
        return db.roads.get(road.key);
      }).then(function(road) {
        assert(road.length === 100);
        done();
      });
    });
    it('can put several records at once', function(done) {
      var keys;
      var road1 = {length: 100, price: 1337};
      var road2 = {length: 200, price: 2030};
      db.write('roads', function(roads) {
        roads.put(road1, road2);
      }).then(function() {
        return db.roads.get(road1.key);
      }).then(function(r1) {
        assert(r1.length === 100);
        return db.roads.get(road2.key);
      }).then(function(r2) {
        assert(r2.length === 200);
        done();
      });
    });
    it('can get several records at once', function(done) {
      var foundRoads;
      db.write('roads', function(roads) {
        var road1 = {length: 100, price: 1337};
        var road2 = {length: 200, price: 2030};
        roads.put(road1, road2)
        .then(function() {
          roads.get(road1.key, road2.key)
          .then(function(found) {
            foundRoads = found;
          });
        });
      }).then(function() {
        assert(foundRoads[0].length === 100);
        assert(foundRoads[1].length === 200);
        done();
      });
    });
    it('support promise chaining with simple values', function(done) {
      var key;
      var road = {length: 100, price: 1337};
      db.write('roads', function(roads) {
        roads.put(road)
        .then(function() {
          return road;
        }).then(function(road) {
          key = road.key;
        });
      }).then(function() {
        assert(key);
        done();
      });
    });
    it('is possible to put and then get in promise chain', function(done) {
      var road = {length: 100, price: 1337};
      db.transaction('roads', 'rw', function(roads) {
        roads.put(road)
        .then(function() {
          return roads.get(road.key);
        }).then(function(road) {
          assert(road.price === 1337);
          done();
        });
      });
    });
    it('is possible to get and then put', function(done) {
      var road = {length: 100, price: 1337};
      db.roads.put(road)
      .then(function() {
        db.transaction('roads', 'rw', function(roads) {
          roads.get(road.key)
          .then(function(r) {
            r.length = 110;
            roads.put(r);
          });
        }).then(function() {
          return db.roads.get(road.key);
        }).then(function(r) {
          assert.equal(r.length, 110);
          done();
        });
      });
    });
    describe('Indexes', function() {
      it('can get records by indexes', function(done) {
        var road = {length: 100, price: 1337};
        db.roads.put(road)
        .then(function() {
          return db.transaction('roads', 'r', function(roads) {
            roads.byLength.get(100)
            .then(function(roads) {
              road = roads[0];
            });
          }).then(function() {
            assert.equal(road.price, 1337);
            done();
          });
        });
      });
      it('can get by indexes and continue in transaction', function(done) {
        var road1, road2;
        var road = {length: 100, price: 1337};
        db.roads.put(road)
        .then(function() {
          return db.transaction('roads', 'r', function(roads) {
            roads.byLength.get(100)
            .then(function(foundRoads) {
              road1 = foundRoads[0];
              roads.get(road1.key).then(function(r) {
                road2 = r;
              });
            });
          }).then(function() {
            assert.equal(road1.price, 1337);
            assert.equal(road2.price, 1337);
            done();
          });
        });
      });
      it('can get records by index in a specified range', function(done) {
        var foundHouses;
        db.houses.put({street: 'Somewhere 1'},
                      {street: 'Somewhere 2'},
                      {street: 'Somewhere 3'},
                      {street: 'Somewhere 4'}
        ).then(function() {
          return db.transaction('houses', 'r', function(houses) {
            return houses.byStreet.inRange({gt: 'Somewhere 2', lte: 'Somewhere 4'})
              .then(function(houses) { foundHouses = houses; });
          });
        }).then(function() {
          assert(foundHouses.length === 2);
          done();
        });
      });
    });
  });
  describe('Store', function() {
    var db;
    beforeEach(function() {
      db = syncedDB.open({name: 'mydb', version: 1, stores: stores});
    });
    it('can get records by key', function(done) {
      var IDBDb;
      db.then(function(db) {
        var req = indexedDB.open('mydb', 1);
        req.onsuccess = function() {
          IDBDb = req.result;
          var tx = IDBDb.transaction('roads', 'readwrite');
          var roads = tx.objectStore('roads');
          roads.add({length: 10, key: 'road1'});
          tx.oncomplete = postAdd;
        };
      });
      function postAdd() {
        db.roads.get('road1').then(function(road1) {
          assert(road1.length === 10);
          IDBDb.close();
          done();
        });
      }
    });
    it('rejects when key not found', function(done) {
      db.roads.get('someKey')
      .catch(function (err) {
        assert.equal(err.type, 'KeyNotFoundError');
        done();
      });
    });
    it('can get several records by key', function(done) {
      var IDBDb;
      db.then(function(db) {
        var req = indexedDB.open('mydb', 1);
        req.onsuccess = function() {
          IDBDb = req.result;
          var tx = IDBDb.transaction('roads', 'readwrite');
          var roads = tx.objectStore('roads');
          roads.add({length: 10, key: 'road1'});
          roads.add({length: 20, key: 'road2'});
          tx.oncomplete = postAdd;
        };
      });
      function postAdd() {
        db.roads.get('road1', 'road2').then(function(roads) {
          assert(roads[0].length === 10);
          assert(roads[1].length === 20);
          IDBDb.close();
          done();
        });
      }
    });
    it('can put records with key', function(done) {
      var house = {street: 'Somewhere 8', built: 1993};
      db.houses.put(house)
      .then(function() {
        return db.houses.get(house.key);
      }).then(function(house) {
        assert(house.built === 1993);
        done();
      });
    });
    it('can put several records at once', function(done) {
      var keys;
      var houses = [{street: 'Somewhere 7', built: 1982},
                    {street: 'Somewhere 8', built: 1993},
                    {street: 'Somewhere 9', built: 2001}];
      db.houses.put(houses[0], houses[1], houses[2])
      .then(function() {
        return db.houses.get(houses[0].key);
      }).then(function(house) {
        assert(house.built === 1982);
        return db.houses.get(houses[1].key);
      }).then(function(house) {
        assert(house.built === 1993);
        return db.houses.get(houses[2].key);
      }).then(function(house) {
        assert(house.built === 2001);
        done();
      });
    });
    it('can delete record by key', function(done) {
      var key;
      db.houses.put({street: 'Somewhere 7', built: 1982})
      .then(function(insertKey) {
        keys = insertKeys;
        return db.houses.delete(insertKey);
      }).then(function(house) {
        return db.houses.get(key);
      }).catch(function(err) {
        done();
      });
    });
    describe('Index', function() {
      var db, put, animals;
      beforeEach(function() {
        db = syncedDB.open({name: 'mydb', version: 1, stores: stores});
        animals = db.animals;
        put = animals.put({name: 'Thumper', race: 'rabbit', color: 'brown'},
                          {name: 'Fluffy', race: 'rabbit', color: 'white'},
                          {name: 'Bella', race: 'dog', color: 'white'});
      });
      it('supports getting by unique index', function(done) {
        put.then(function() {
          return animals.byName.get('Thumper');
        }).then(function(thumpers) {
          assert.equal(thumpers[0].race, 'rabbit');
          assert.equal(thumpers[0].color, 'brown');
          done();
        });
      });
      it('can get multiple records', function(done) {
        put.then(function() {
          return animals.byColor.get('white');
        }).then(function(animals) {
          assert(animals[0].name == 'Bella' ? animals[1].name == 'Fluffy'
                                            : animals[1].name == 'Bella');
          done();
        });
      });
      it('can get all records', function(done) {
        db.houses.put({street: 'Somewhere 7', built: 1982},
                      {street: 'Somewhere 8', built: 1993},
                      {street: 'Somewhere 9', built: 2001})
        .then(function(putKeys) {
          return db.houses.byStreet.getAll();
        }).then(function(allHouses) {
          assert.equal(allHouses.length, 3);
          done();
        });
      });
      it('returns an array if store isnt unique', function(done) {
        put.then(function() {
          return animals.byColor.get('brown');
        }).then(function(brownAnimals) {
          assert(brownAnimals.length === 1);
          done();
        });
      });
    });
  });
  describe('Events', function() {
    var db;
    beforeEach(function() {
      db = syncedDB.open({name: 'mydb', version: 1, stores: stores});
    });
    it('emits add event when creating record', function(done) {
      db.roads.on('add', function(e) {
        done();
      });
      db.roads.put({length: 100, price: 1337});
    });
    it('emits update event when modifying record', function(done) {
      var spy1 = sinon.spy();
      var spy2 = sinon.spy();
      db.roads.on('add', spy1);
      db.roads.on('update', spy2);
      var road = {length: 100, price: 1337};
      db.roads.put(road)
      .then(function() {
        return db.roads.put(road);
      }).then(function() {
        assert(spy1.calledOnce);
        assert(spy2.calledOnce);
        done();
      });
    });
    it('emits event when creating object inside transactions', function(done) {
      db.write('roads', function(roads) {
        roads.put({length: 100, price: 1337});
      });
      db.roads.on('add', function(addedId) {
        done();
      });
    });
    it('add event contains the added record', function(done) {
      var record = {length: 100, price: 1337};
      db.roads.on('add', function(e) {
        assert.equal(record.length, e.record.length);
        assert.equal(record.price, e.record.price);
        done();
      });
      db.roads.put(record);
    });
  });
  describe('Syncing', function() {
    var db, timestamp;
    var globalWebSocket = window.WebSocket;
    var ws, sendSpy;
    var onSend = function() {};
    beforeEach(function() {
      onSend = function() {};
      timestamp = 0;
      sendSpy = sinon.spy();
      window.WebSocket = function(url, protocol) {
        ws = {
          close: function() {},
          send: function() {
            sendSpy.apply(null, arguments);
            onSend.apply(null, arguments);
          }
        };
        setTimeout(function() {
          ws.onopen();
        }, 0);
        return ws;
      };
      db = syncedDB.open({name: 'mydb', version: 1, stores: stores});
    });
    afterEach(function() {
      window.WebSocket = globalWebSocket;
    });
    it('stores meta data when creating new record', function(done) {
      db.roads.on('add', function(e) {
        assert(e.record.changedSinceSync === 1);
        done();
      });
      db.roads.put({length: 100, price: 1337});
    });
    it('can\'t begin sync when already syncing', function(done) {
      onSend = function(msg) {
        var data = JSON.parse(msg);
        assert.equal(data.type, 'get-changes');
        assert.deepEqual(data.storeName, 'roads');
        ws.onmessage({data: JSON.stringify({
          type: 'sending-changes',
          nrOfRecordsToSync: 0
        })});
      };
      db.sync('roads').then(function() {
        done();
      });
      db.sync('roads').catch(function(err) {
        assert.equal(err.type, 'AlreadySyncing');
      });
    });
    it('finds newly added records', function(done) {
      db.roads.put({length: 100, price: 1337})
      .then(function() {
        return db.roads.changedSinceSync.get(1);
      }).then(function(changedRoads) {
        assert(changedRoads.length === 1);
        done();
      });
    });
    describe('to server', function() {
      it('sends added record', function(done) {
        var road = {length: 100, price: 1337};
        onSend = function(msg) {
          var sent = JSON.parse(msg);
          ws.onmessage({data: JSON.stringify({
            type: 'ok',
            storeName: 'roads',
            key: sent.record.key,
            timestamp: timestamp++,
            newVersion: 0,
          })});
        };
        db.roads.put(road)
        .then(function(roadId) {
          return db.pushToRemote();
        }).then(function() {
          var sent = JSON.parse(sendSpy.getCall(0).args[0]);
          assert.deepEqual(sent.record, {
            length: 100, price: 1337, key: road.key
          });
          done();
        });
      });
      it('only sends records from specified store', function(done) {
        var road = {length: 100, price: 1337};
        var house = {street: 'Somewhere Street 1'};
        onSend = function(msg) {
          var sent = JSON.parse(msg);
          ws.onmessage({data: JSON.stringify({
            type: 'ok',
            storeName: sent.storeName,
            key: sent.record.key,
            timestamp: timestamp++,
            newVersion: 0,
          })});
        };
        db.roads.put(road)
        .then(function() {
          return db.houses.put(house);
        }).then(function(roadId) {
          return db.pushToRemote('roads');
        })
        .then(function() {
          var sent = JSON.parse(sendSpy.getCall(0).args[0]);
          assert.deepEqual(sent.record, {
            length: 100, price: 1337, key: road.key
          });
          assert.equal(sendSpy.callCount, 1);
          done();
        });
      });
      it('synchronized records are marked as unchanged', function(done) {
        var road = {length: 100, price: 1337};
        onSend = function(msg) {
          var sent = JSON.parse(msg);
          ws.onmessage({data: JSON.stringify({
            type: 'ok',
            storeName: 'roads',
            key: sent.record.key,
            timestamp: timestamp++,
            newVersion: 0,
          })});
        };
        db.roads.put(road)
        .then(function(roadId) {
          assert(road.changedSinceSync === 1);
          return db.pushToRemote();
        })
        .then(function() {
          return db.roads.get(road.key);
        }).then(function(road) {
          assert(road.changedSinceSync === 0);
          done();
        });
      });
      it('emits event when records are synced', function(done) {
        var road = {length: 100, price: 1337};
        var spy = sinon.spy();
        onSend = function(msg) {
          var sent = JSON.parse(msg);
          sentKey = sent.record.key;
          assert(spy.notCalled);
          ws.onmessage({data: JSON.stringify({
            type: 'ok',
            storeName: 'roads',
            key: sent.record.key,
            timestamp: timestamp++,
            newVersion: 0,
          })});
        };
        db.roads.on('synced', spy);
        db.roads.put(road).then(function(roadId) {
          return db.pushToRemote();
        }).then(function() {
          assert(spy.calledOnce);
          assert.equal(spy.firstCall.args[1].price, 1337);
          done();
        });
      });
      it('sends updated records', function(done) {
        var road = {length: 100, price: 1337};
        onSend = function(raw) {
          var msg = JSON.parse(raw);
          ws.onmessage({data: JSON.stringify({
            type: 'ok',
            storeName: 'roads',
            key: msg.key || msg.record.key,
            timestamp: timestamp++,
            newVersion: (msg.version + 1) || 0,
          })});
        };
        db.roads.put(road)
        .then(function(key) {
          return db.pushToRemote();
        }).then(function() {
          road.length = 110;
          return db.roads.put(road);
        }).then(function() {
          return db.pushToRemote();
        }).then(function() {
          var secondSend = JSON.parse(sendSpy.getCall(1).args[0]);
          assert.equal(secondSend.type, 'update');
          assert.equal(secondSend.diff.m[2], 110);
          done();
        });
      });
      it('sends deleted records', function(done) {
        var road = {length: 100, price: 1337};
        onSend = function(raw) {
          var msg = JSON.parse(raw);
          ws.onmessage({data: JSON.stringify({
            type: 'ok',
            storeName: 'roads',
            key: msg.key || msg.record.key,
            timestamp: timestamp++,
            newVersion: (msg.version + 1) || 0,
          })});
        };
        db.roads.put(road)
        .then(function(key) {
          return db.pushToRemote();
        }).then(function() {
          road.length = 110;
          return db.roads.delete(road);
        }).then(function() {
          return db.pushToRemote();
        }).then(function() {
          var secondSend = JSON.parse(sendSpy.getCall(1).args[0]);
          assert.equal(secondSend.type, 'delete');
          done();
        });
      });
      it('doesn\'t find synced and deleted records', function(done) {
        var road = {length: 100, price: 1337};
        onSend = function(raw) {
          var msg = JSON.parse(raw);
          ws.onmessage({data: JSON.stringify({
            type: 'ok',
            storeName: 'roads',
            key: msg.key || msg.record.key,
            timestamp: timestamp++,
            newVersion: (msg.version + 1) || 0,
          })});
        };
        db.roads.put(road).then(function(key) {
          return db.pushToRemote();
        }).then(function() {
          return db.roads.delete(road);
        }).then(function(r) {
          return db.roads.get(road.key);
        }).catch(function(el) {
          return db.pushToRemote();
        }).then(function(r) {
          done();
        });
      });
      it('handles new key from remote', function(done) {
        var firstKey, newKey, road = {length: 100, price: 1337};
        onSend = function(msg) {
          var sent = JSON.parse(msg);
          ws.onmessage({data: JSON.stringify({
            type: 'ok',
            storeName: 'roads',
            key: sent.record.key,
            newKey: 1,
            timestamp: timestamp++,
            newVersion: 0,
          })});
        };
        db.roads.on('synced', function(key, record) {
          assert.equal(key, firstKey);
          assert.notEqual(key, record.key);
          newKey = record.key;
        });
        db.roads.put(road).then(function(roadKey) {
          firstKey = roadKey;
          return db.pushToRemote();
        }).then(function() {
          return db.roads.get(newKey);
        }).then(function(road) {
          assert.equal(road.length, 100);
          done();
        });
      });
      it('updates syncedTo on `ok` message', function(done) {
        var secondMsg, road = {length: 100, price: 1337};
        onSend = function(msg) {
          var sent = JSON.parse(msg);
          if (sent.type === 'create') {
            ws.onmessage({data: JSON.stringify({
              type: 'ok',
              storeName: 'roads',
              key: sent.record.key,
              timestamp: 8,
              newVersion: 0,
            })});
          } else {
            secondMsg = sent;
            ws.onmessage({data: JSON.stringify({
              type: 'sending-changes',
              nrOfRecordsToSync: 0
            })});
          }
        };
        db.roads.put(road).then(function(roadId) {
          return db.pushToRemote();
        }).then(function() {
          console.log('done push');
          return db.pullFromRemote('roads');
        }).then(function() {
          console.log(secondMsg);
          assert.equal(secondMsg.since, 8);
          done();
        });
      });
      it('can send custom messages to the remote', function(done) {
        onSend = function(msg) {
          var sent = JSON.parse(msg);
          assert.deepEqual(sent, {
            type: 'customType', data: 'something'
          });
          done();
        };
        db.connect().then(function() {
          db.send({type: 'customType', data: 'something'});
        });
      });
      it('can receive custom messages from the remote after connect', function(done) {
        db.messages.on('custom-msg', function(msg) {
          assert.equal(msg.data, 'foobar');
          done();
        });
        db.connect().then(function() {
          ws.onmessage({data: JSON.stringify({
            type: 'custom-msg',
            data: 'foobar'
          })});
        });
      });
    });
    describe('from server', function() {
      it('finishes sync if nr of records to sync is zero', function(done) {
        onSend = function(msg) {
          var data = JSON.parse(msg);
          assert.equal(data.type, 'get-changes');
          assert.deepEqual(data.storeName, 'roads');
          ws.onmessage({data: JSON.stringify({
            type: 'sending-changes',
            nrOfRecordsToSync: 0
          })});
        };
        db.sync('roads')
        .then(function() {
          done();
        });
      });
      it('handles created documents', function(done) {
        onSend = function(msg) {
          var data = JSON.parse(msg);
          assert.equal(data.type, 'get-changes');
          assert.deepEqual(data.storeName, 'roads');
          ws.onmessage({data: JSON.stringify({
            type: 'sending-changes',
            nrOfRecordsToSync: 1
          })});
          ws.onmessage({data: JSON.stringify({
            type: 'create',
            storeName: 'roads',
            timestamp: 1,
            record: {version: 0, length: 133, price: 1000, key: 'foo'}
          })});
        };
        db.pullFromRemote('roads')
        .then(function() {
          return db.roads.byLength.get(133);
        }).then(function(road) {
          assert.equal(road[0].price, 1000);
          done();
        });
      });
      it('handles created documents', function(done) {
        onSend = function(msg) {
          var data = JSON.parse(msg);
          assert.equal(data.type, 'get-changes');
          assert.deepEqual(data.storeName, 'roads');
          ws.onmessage({data: JSON.stringify({
            type: 'sending-changes',
            nrOfRecordsToSync: 1
          })});
          ws.onmessage({data: JSON.stringify({
            type: 'create',
            storeName: 'roads',
            timestamp: 1,
            record: {version: 0, length: 133, price: 1000, key: 'foo'}
          })});
        };
        db.pullFromRemote('roads')
        .then(function() {
          return db.roads.byLength.get(133);
        }).then(function(road) {
          assert.equal(road[0].price, 1000);
          done();
        });
      });
      it('saves original remote version', function(done) {
        var roads;
        onSend = function(msg) {
          var data = JSON.parse(msg);
          assert.equal(data.type, 'get-changes');
          assert.deepEqual(data.storeName, 'roads');
          ws.onmessage({data: JSON.stringify({
            type: 'sending-changes',
            nrOfRecordsToSync: 1
          })});
          ws.onmessage({data: JSON.stringify({
            type: 'create',
            storeName: 'roads',
            timestamp: 1,
            record: {version: 0, length: 133, price: 1000, key: 'foo'}
          })});
        };
        db.pullFromRemote('roads')
        .then(function() {
          return db.roads.byLength.get(133);
        }).then(function(roads) {
          road = roads[0];
          road.price = 1300;
          return db.roads.put(road);
        }).then(function() {
          assert.equal(road.price, 1300);
          assert.equal(road.remoteOriginal.price, 1000);
          done();
        });
      });
      it('handles updated documents', function(done) {
        var road = {length: 100, price: 1337};
        onSend = function(raw) {
          var msg = JSON.parse(raw);
          if (msg.type === 'create') {
            ws.onmessage({data: JSON.stringify({
              type: 'ok',
              storeName: 'roads',
              key: msg.record.key,
              timestamp: timestamp++,
              newVersion: 0,
            })});
          } else {
            ws.onmessage({data: JSON.stringify({
              type: 'sending-changes',
              nrOfRecordsToSync: 1
            })});
            ws.onmessage({data: JSON.stringify({
              type: 'update',
              storeName: 'roads',
              key: road.key,
              timestamp: 1,
              version: 1,
              diff: {m: {0: 110}},
            })});
          }
        };
        db.roads.put(road)
        .then(function() {
          roadKey = road.key;
          return db.pushToRemote();
        }).then(function() {
          db.pullFromRemote();
        }).then(function() {
          return db.roads.get(roadKey);
        }).then(function(road) {
          assert(road.changedSinceSync === 0);
          done();
        });
      });
      it('handles deleted documents', function(done) {
        var road = {length: 100, price: 1337};
        var roadKey;
        onSend = function(raw) {
          var msg = JSON.parse(raw);
          if (msg.type === 'create') {
            ws.onmessage({data: JSON.stringify({
              type: 'ok',
              storeName: 'roads',
              key: msg.record.key,
              timestamp: timestamp++,
              newVersion: 0,
            })});
          } else {
            ws.onmessage({data: JSON.stringify({
              type: 'sending-changes',
              nrOfRecordsToSync: 1
            })});
            ws.onmessage({data: JSON.stringify({
              type: 'delete',
              storeName: 'roads',
              key: roadKey,
              timestamp: 1,
              version: 1,
            })});
          }
        };
        db.roads.put(road)
        .then(function(key) {
          roadKey = road.key;
          return db.pushToRemote();
        }).then(function() {
          return db.pullFromRemote();
        }).then(function() {
          return db.roads.get(roadKey);
        }).catch(function(err) {
          assert.equal(err.type, 'KeyNotFoundError');
          done();
        });
      });
      it('emits conflict on update to changed record', function(done) {
        var road = {length: 100, price: 1337};
        var stub = sinon.stub().returnsArg(1);
        db.stores.roads.handleConflict = stub;
        onSend = function(raw) {
          var msg = JSON.parse(raw);
          if (msg.type === 'create') {
            ws.onmessage({data: JSON.stringify({
              type: 'ok',
              storeName: 'roads',
              key: msg.record.key,
              timestamp: timestamp++,
              newVersion: 0,
            })});
          } else if (msg.type === 'update') {
            ws.onmessage({data: JSON.stringify({
              type: 'ok',
              storeName: 'roads',
              timestamp: timestamp++,
              key: msg.key,
            })});
          } else {
            ws.onmessage({data: JSON.stringify({
              type: 'sending-changes',
              nrOfRecordsToSync: 1
            })});
            ws.onmessage({data: JSON.stringify({
              type: 'update',
              storeName: 'roads',
              key: road.key,
              timestamp: 1,
              version: 1,
              diff: {m: {1: 110}},
            })});
          }
        };
        db.roads.put(road)
        .then(function() {
          return db.pushToRemote();
        }).then(function() {
          road.price = 2000;
          return db.roads.put(road);
        }).then(function() {
          return db.pullFromRemote();
        }).then(function() {
          assert(stub.calledOnce);
          assert.deepEqual(stub.getCall(0).args[0], {
            length: 100, price: 1337, key: road.key
          });
          assert.deepEqual(stub.getCall(0).args[1], {
            length: 100, price: 2000, key: road.key
          });
          assert.deepEqual(stub.getCall(0).args[2], {
            length: 110, price: 1337, key: road.key
          });
          done();
        });
      });
      it('emits conflict on update to locally deleted record', function(done) {
        var road = {length: 100, price: 1337};
        var stub = sinon.stub().returnsArg(1);
        db.stores.roads.handleConflict = stub;
        onSend = function(raw) {
          var msg = JSON.parse(raw);
          if (msg.type === 'create') {
            ws.onmessage({data: JSON.stringify({
              type: 'ok',
              storeName: 'roads',
              key: msg.record.key,
              timestamp: timestamp++,
              newVersion: 0,
            })});
          } else {
            ws.onmessage({data: JSON.stringify({
              type: 'sending-changes',
              nrOfRecordsToSync: 1
            })});
            ws.onmessage({data: JSON.stringify({
              type: 'update',
              storeName: 'roads',
              key: road.key,
              timestamp: 1,
              version: 1,
              diff: {m: {1: 110}},
            })});
          }
        };
        db.roads.put(road)
        .then(function() {
          return db.pushToRemote();
        }).then(function() {
          return db.roads.delete(road);
        }).then(function() {
          return db.pullFromRemote();
        }).then(function() {
          assert(stub.calledOnce);
          assert.deepEqual(stub.getCall(0).args[0], {
            length: 100, price: 1337, key: road.key
          });
          assert.deepEqual(stub.getCall(0).args[1], {
            deleted: true, key: road.key
          });
          assert.deepEqual(stub.getCall(0).args[2], {
            length: 110, price: 1337, key: road.key
          });
          done();
        });
      });
      it('emits conflict on remote delete to locally modified record', function(done) {
        var road = {length: 100, price: 1337};
        var stub = sinon.stub().returnsArg(1);
        db.stores.roads.handleConflict = stub;
        onSend = function(raw) {
          var msg = JSON.parse(raw);
          if (msg.type === 'create') {
            ws.onmessage({data: JSON.stringify({
              type: 'ok',
              storeName: 'roads',
              key: msg.record.key,
              timestamp: timestamp++,
              newVersion: 0,
            })});
          } else {
            ws.onmessage({data: JSON.stringify({
              type: 'sending-changes',
              nrOfRecordsToSync: 1
            })});
            ws.onmessage({data: JSON.stringify({
              type: 'delete',
              storeName: 'roads',
              key: road.key,
              timestamp: 1,
              version: 1,
            })});
          }
        };
        db.roads.put(road)
        .then(function() {
          return db.pushToRemote();
        }).then(function() {
          road.length = 110;
          return db.roads.put(road);
        }).then(function() {
          return db.pullFromRemote();
        }).then(function() {
          assert(stub.calledOnce);
          assert.deepEqual(stub.getCall(0).args[0], {
            length: 100, price: 1337, key: road.key
          });
          assert.deepEqual(stub.getCall(0).args[1], {
            length: 110, price: 1337, key: road.key
          });
          assert.deepEqual(stub.getCall(0).args[2], {
            deleted: true, key: road.key
          });
          done();
        });
      });
      it('requests changes since last sync', function(done) {
        onSend = function(msg) {
          var data = JSON.parse(msg);
          if (data.since === null) {
            ws.onmessage({data: JSON.stringify({
              type: 'sending-changes',
              nrOfRecordsToSync: 1
            })});
            ws.onmessage({data: JSON.stringify({
              type: 'create',
              storeName: 'roads',
              timestamp: 0,
              record: {version: 0, length: 133, price: 1000, key: 'foo'}
            })});
          } else {
            ws.onmessage({data: JSON.stringify({
              type: 'sending-changes',
              nrOfRecordsToSync: 0
            })});
          }
        };
        db.pullFromRemote('roads')
        .then(function() {
          return db.pullFromRemote('roads');
        }).then(function(road) {
          assert(sendSpy.calledTwice);
          done();
        });
      });
      it('emits events for created documents', function(done) {
        var key;
        onSend = function(msg) {
          var data = JSON.parse(msg);
          assert(data.type === 'get-changes');
          ws.onmessage({data: JSON.stringify({
            type: 'sending-changes',
            nrOfRecordsToSync: 1
          })});
          ws.onmessage({data: JSON.stringify({
            type: 'create',
            storeName: 'roads',
            timestamp: 1,
            record: {version: 0, length: 133, price: 1000, key: 'foo'}
          })});
        };
        db.roads.on('add', function(e) {
          key = e.record.key;
        });
        db.pullFromRemote('roads')
        .then(function() {
          assert.equal(key, 'foo');
          done();
        });
      });
      it('emits event when custom message is recieved', function(done) {
        db.messages.on('myMsgType', function(msg) {
          assert.deepEqual(msg, {type: 'myMsgType', data: 'stuff'});
          done();
        });
        onSend = function(msg) {
          var data = JSON.parse(msg);
          assert(data.type === 'get-changes');
          ws.onmessage({data: JSON.stringify({
            type: 'myMsgType',
            data: 'stuff',
          })});
        };
        db.pullFromRemote('animals');
      });
      it('emits event on store when custom message with store name is recieved', function(done) {
        db.animals.messages.on('myMsgType', function(msg) {
          assert.deepEqual(msg, {
            type: 'myMsgType',
            storeName: 'animals',
            data: 'stuff'
          });
          done();
        });
        onSend = function(msg) {
          var data = JSON.parse(msg);
          assert(data.type === 'get-changes');
          ws.onmessage({data: JSON.stringify({
            type: 'myMsgType',
            storeName: 'animals',
            data: 'stuff',
          })});
        };
        db.pullFromRemote('animals');
      });
      it('emits event when sync is started', function(done) {
        var road = {length: 100, price: 1337};
        var spy = sinon.spy();
        onSend = function(msg) {
          var data = JSON.parse(msg);
          assert(data.type === 'get-changes');
          ws.onmessage({data: JSON.stringify({
            type: 'sending-changes',
            nrOfRecordsToSync: 1
          })});
          ws.onmessage({data: JSON.stringify({
            type: 'create',
            storeName: 'roads',
            timestamp: 1,
            record: {version: 0, length: 133, price: 1000, key: 'foo'}
          })});
        };
        db.on('sync-initiated', spy);
        db.pullFromRemote('roads').then(function() {
          assert(spy.calledOnce);
          assert.equal(spy.firstCall.args[0].nrOfRecordsToSync, 1);
          done();
        });
      });
      it('calls handle on reject message and skips record', function(done) {
        var road = {length: 100, price: 1337};
        var spy = sinon.stub().returns(false);
        db.roads.handleReject = spy;
        onSend = function(msg) {
          var data = JSON.parse(msg);
          assert(data.type === 'create');
          if (data.record.length === 100) {
            ws.onmessage({data: JSON.stringify({
              type: 'reject',
              storeName: data.storeName,
              key: data.record.key,
            })});
          } else {
            ws.onmessage({data: JSON.stringify({
              type: 'ok', storeName: 'roads', key: data.record.key, newVersion: 0, timestamp: timestamp++,
            })});
          }
        };
        db.roads.put(road).then(function() {
          return db.pushToRemote('roads');
        }).then(function() {
          road.length = 110;
          return db.roads.put(road);
        }).then(function() {
          return db.pushToRemote('roads');
        }).then(function() {
          assert(spy.calledOnce);
          assert.equal(spy.getCall(0).args[0].length, 100);
          assert.equal(spy.getCall(0).args[1].storeName, 'roads');
          done();
        });
      });
      it('calls handle on reject message and resends record', function(done) {
        var road = {length: 100, price: 1337};
        var spy = sinon.stub().returnsArg(0);
        db.roads.handleReject = spy;
        var msgCount = 0;
        onSend = function(msg) {
          msgCount++;
          var data = JSON.parse(msg);
          assert(data.type === 'create');
          if (msgCount === 1) {
            ws.onmessage({data: JSON.stringify({
              type: 'reject',
              storeName: data.storeName,
              key: data.record.key,
            })});
          } else {
            ws.onmessage({data: JSON.stringify({
              type: 'ok', storeName: 'roads', key: data.record.key, newVersion: 0, timestamp: timestamp++,
            })});
          }
        };
        db.roads.put(road).then(function() {
          return db.pushToRemote('roads');
        }).then(function() {
          assert(spy.calledOnce);
          assert.equal(spy.getCall(0).args[0].length, 100);
          assert.equal(spy.getCall(0).args[1].storeName, 'roads');
          done();
        });
      });
    });
    describe('continuous sync', function() {
      it('sends added records when syncing', function(done) {
        onSend = function(msg) {
          var data = JSON.parse(msg);
          if (data.type === 'get-changes') {
            ws.onmessage({data: JSON.stringify({
              type: 'sending-changes',
              nrOfRecordsToSync: 0
            })});
          } else {
            ws.onmessage({data: JSON.stringify({
              type: 'ok',
              storeName: 'animals',
              timestamp: timestamp++,
              key: data.record.key,
            })});
          }
        };
        db.syncContinuously('animals').then(function() {
          db.animals.put({color: 'grey', name: 'Mister'})
          .then(function() {
            var secondSend = JSON.parse(sendSpy.getCall(1).args[0]);
            assert.equal(secondSend.type, 'create');
            assert.equal(secondSend.record.color, 'grey');
            done();
          });
        });
      });
      it('sends updated records when syncing', function(done) {
        onSend = function(data) {
          var msg = JSON.parse(data);
          if (msg.type === 'get-changes') {
            ws.onmessage({data: JSON.stringify({
              type: 'sending-changes',
              nrOfRecordsToSync: 0
            })});
          } else {
            ws.onmessage({data: JSON.stringify({
              type: 'ok',
              storeName: 'animals',
              key: msg.key || msg.record.key,
              timestamp: timestamp++,
              newVersion: (msg.version + 1) || 0,
            })});
          }
        };
        db.syncContinuously('animals').then(function() {
          var cat = {color: 'grey', name: 'Mister'};
          db.animals.put(cat)
          .then(function() {
            cat.color = 'white';
            return db.animals.put(cat);
          }).then(function() {
            var secondSend = JSON.parse(sendSpy.getCall(1).args[0]);
            assert.equal(secondSend.type, 'create');
            assert.deepEqual(secondSend.record, {
              color: 'grey', name: 'Mister', key: cat.key
            });
            console.log(secondSend);
            var thirdSend = JSON.parse(sendSpy.getCall(2).args[0]);
            console.log('thirdSend');
            console.log(thirdSend);
            assert.equal(thirdSend.type, 'update');
            assert.equal(thirdSend.diff.m[1], 'white');
            done();
          });
        });
      });
      it('sends multiple updates continuously', function(done) {
        onSend = function(data) {
          var msg = JSON.parse(data);
          if (msg.type === 'get-changes') {
            ws.onmessage({data: JSON.stringify({
              type: 'sending-changes',
              nrOfRecordsToSync: 0
            })});
          } else {
            ws.onmessage({data: JSON.stringify({
              type: 'ok',
              storeName: 'animals',
              key: msg.key || msg.record.key,
              timestamp: timestamp++,
              newVersion: (msg.version + 1) || 0,
            })});
          }
        };
        db.syncContinuously('animals').then(function() {
          var cat = {color: 'grey', name: 'Mister'};
          db.animals.put(cat)
          .then(function() {
            cat.color = 'white';
            return db.animals.put(cat);
          }).then(function() {
            cat.color = 'grey';
            return db.animals.put(cat);
          }).then(function() {
            var secondSend = JSON.parse(sendSpy.getCall(1).args[0]);
            assert.equal(secondSend.type, 'create');
            assert.equal(secondSend.record.color, 'grey');
            var thirdSend = JSON.parse(sendSpy.getCall(2).args[0]);
            assert.equal(thirdSend.type, 'update');
            assert.equal(thirdSend.diff.m[1], 'white');
            var fourthSend = JSON.parse(sendSpy.getCall(3).args[0]);
            assert.equal(fourthSend.diff.m[1], 'grey');
            done();
          });
        });
      });
    });
  });
});