const { getAdmin, getImplementation, encodeCall, expectEvent, expectRevert, assertRevert, EdgeToken, EdgeTokenConstructorUpgrade, EdgeTokenProxy, ZERO_ADDRESS } = require('../common')
const { BaseOperators } = require('@sygnum/solidity-base-contracts')


contract('EdgeTokenConstructorUpgrade', ([owner, admin, operator, proxyAdmin, proxyAdminNew, attacker, whitelisted, newAddress]) => {
    beforeEach(async () => {
        this.baseOperators = await BaseOperators.new(admin, {from:admin})

        await this.baseOperators.addOperator(operator, {from:admin})
        assert.equal(await this.baseOperators.isOperator(operator), true, "operator not set");
        
        this.tokenImpl = await EdgeToken.new()
        this.tokenImplUpgrade = await EdgeTokenConstructorUpgrade.new()
        const initializeData = encodeCall('initialize', ['address'], [this.baseOperators.address])
        this.proxy = await EdgeTokenProxy.new(this.tokenImpl.address, proxyAdmin, initializeData, {from: owner})
        this.token = await EdgeToken.at(this.proxy.address)
    })

    context('deployed proxy', () => {
        describe('has implementation set', () => {
            it('check implementation set', async () =>{
                assert.equal(await getImplementation(this.proxy), this.tokenImpl.address.toLowerCase())
            })
        })
        context('admin set', () => {
            it('check admin set', async () => {
                assert.equal(await getAdmin(this.proxy), proxyAdmin.toLowerCase())
            })
            describe('non-functional', () => {
                it('admin transfer admin', async () => {
                    ({ logs: this.logs } = await this.proxy.changeAdmin(proxyAdminNew, { from: proxyAdmin }))
                    assert.equal(await getAdmin(this.proxy), proxyAdminNew.toLowerCase())                    
                })
                it('emits a AdminChanged event', () => {
                    expectEvent.inLogs(this.logs, 'AdminChanged', { previousAdmin:proxyAdmin , newAdmin: proxyAdminNew })
                })
            })            
            describe('functional', () => {
                it('admin transfer admin', async () => {
                    ({ logs: this.logs } = await this.proxy.changeAdmin(proxyAdminNew, { from: proxyAdmin }))
                    assert.equal(await getAdmin(this.proxy), proxyAdminNew.toLowerCase())                    
                })
                it('emits a AdminChanged event', () => {
                    expectEvent.inLogs(this.logs, 'AdminChanged', { previousAdmin:proxyAdmin , newAdmin: proxyAdminNew })
                })
            })            

            describe('change admin', () => {
                describe('from proxy admin', () => {
                    it('can transfer admin', async () => {
                        ({ logs: this.logs } = await this.proxy.changeAdmin(proxyAdminNew, { from: proxyAdmin }))
                        assert.equal(await getAdmin(this.proxy), proxyAdminNew.toLowerCase())
                    })
                    it('emits a AdminChanged event', () => {
                        expectEvent.inLogs(this.logs, 'AdminChanged', { previousAdmin:proxyAdmin , newAdmin: proxyAdminNew })
                    })
                    it('reverts when assigning empty address', async () => {
                        await expectRevert(this.proxy.changeAdmin(ZERO_ADDRESS, { from: proxyAdmin }), 'Cannot change the admin of a proxy to the zero address.')
                    })
                describe('from token admin', () => {
                    it('reverts', async () => {
                        await assertRevert(this.proxy.changeAdmin(proxyAdminNew, {from: admin}))
                    })
                })
                describe('from attacker', () => {
                    it('reverts', async () => {
                        await assertRevert(this.proxy.changeAdmin(proxyAdminNew, {from: attacker}))
                    })
                })
            })
          })
        })
        context('upgradability', () => {
          describe('upgrade to', () => {
            describe('from proxy admin', async () => {
                it('can upgrade to new implementation', async () => {
                    await this.proxy.upgradeTo(this.tokenImplUpgrade.address, { from: proxyAdmin })
                    assert.equal(await getImplementation(this.proxy), this.tokenImplUpgrade.address.toLowerCase())
                })
                it('reverts when implementation empty address', async () => {
                    await expectRevert(this.proxy.upgradeTo(ZERO_ADDRESS, { from: proxyAdmin }), 'Cannot set a proxy implementation to a non-contract address.')
                })          
            })
          describe('upgrade and call', () => {
            beforeEach(() => {
               this.initializeDataV1 = encodeCall('initializeConstructor')
            })
            it('from proxy admin', async () => {
                await this.proxy.upgradeToAndCall(this.tokenImplUpgrade.address, this.initializeDataV1, { from: proxyAdmin })
                assert.equal(await getImplementation(this.proxy), this.tokenImplUpgrade.address.toLowerCase())
            })
            it('reverts from token admin', async () => {
                await assertRevert(this.proxy.upgradeToAndCall(this.tokenImplUpgrade.address, this.initializeDataV1, { from: admin }))
                assert.equal(await getImplementation(this.proxy), this.tokenImpl.address.toLowerCase())
            })
            it('reverts when implementation empty address', async () => {
                await assertRevert(this.proxy.upgradeToAndCall(ZERO_ADDRESS, this.initializeDataV1, { from: admin }))
                assert.equal(await getImplementation(this.proxy), this.tokenImpl.address.toLowerCase())
            })
          })
        })
      })
      context('upgrade and call', () => {
        describe('constructor values initialized', () => {
            beforeEach(async () => {
                this.initializeDataV1 = encodeCall('initializeConstructor')
                await this.proxy.upgradeToAndCall(this.tokenImplUpgrade.address, this.initializeDataV1, {from: proxyAdmin})
                this.token = await EdgeTokenConstructorUpgrade.at(this.proxy.address)
                assert.equal(this.token.address, this.proxy.address)         
            })
            it('name updated', async () => {
                assert.equal(await this.token.name(), "Digital CHF")
            })
            it('symbol updated', async () => {
                assert.equal(await this.token.symbol(), "DCHF")
            })
            it('decimals updated', async () => {
                assert.equal(await this.token.decimals(), 2)
            })
            describe('constructor values initialized', () => {
                beforeEach(async () => {
                    await this.token.toggleWhitelist(whitelisted, true, { from: operator })
                    await this.token.mint(whitelisted, 100, { from: operator })
                });
                it('ensure mint balance updated', async () => {
                    assert.equal(await this.token.balanceOf(whitelisted), 100)
                });
                describe('old versions', () => {
                    beforeEach(async () => {
                        this.token = await EdgeToken.at(this.proxy.address)
                        await this.token.mint(whitelisted, 100, { from: operator })                            
                    });
                    it('old version works', async () => {
                        assert.equal(await this.token.balanceOf(whitelisted), 200)
                    });
                    describe('then switch to new versions', () => {
                        beforeEach(async () => {
                            this.token = await EdgeTokenConstructorUpgrade.at(this.proxy.address)
                            await this.token.mint(whitelisted, 100, { from: operator })                            
                        });
                        it('new version works', async () => {
                            assert.equal(await this.token.balanceOf(whitelisted), 300)
                        });
                });
            })
            })
         })
        })
    })
})