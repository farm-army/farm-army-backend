"use strict";

const MasterChefWithAutoCompoundAndRewards = require("../../common").MasterChefWithAutoCompoundAndRewards;

module.exports = class frankenstein extends MasterChefWithAutoCompoundAndRewards {
  getFarmLink() {
    return 'https://frankenstein.finance/?ref=0x898e99681C29479b86304292b03071C80A57948F/#/farms';
  }

  getMasterChefAddress() {
    return '0xd920cae9EF3BA9DE82BcdB93015A90b0A81F32E3';
  }

  getChain() {
    return 'fantom';
  }
};
