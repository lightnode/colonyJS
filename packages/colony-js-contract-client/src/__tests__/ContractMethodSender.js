/* eslint-env jest */
/* eslint-disable no-underscore-dangle */

import createSandbox from 'jest-sandbox';
import BigNumber from 'bn.js';

import ContractClient from '../classes/ContractClient';
import ContractMethodSender from '../classes/ContractMethodSender';

describe('ContractMethodSender', () => {
  const sandbox = createSandbox();
  const contract = {};
  const eventHandlers = {
    success: {
      myEventOne: {
        handler({ eventOneResult }) {
          return eventOneResult;
        },
        contract,
      },
      myEventTwo: {
        handler({ eventTwoResult }) {
          return eventTwoResult;
        },
        contract,
      },
    },
  };
  const functionName = 'myFunction';
  const callArgs = [1];
  const input = [['id', 'number']];
  const inputValues = { id: 1 };
  const options = {
    timeoutMs: 5000,
    miningTimeoutMs: 10000,
    gasLimit: 1000,
    gasPrice: 2000,
    nonce: 1,
    value: 0,
    waitForMining: true,
  };
  const transaction = { hash: '0x123' };
  const eventData = {
    myEventOne: 1,
    myEventTwo: 2,
  };
  const receipt = {
    hash: '0x123',
    blockHash: '0x234',
    status: 1,
  };
  const contractResponse = {
    eventData,
    meta: {
      receipt,
      transaction,
    },
  };
  const adapter = {
    getTransactionReceipt: sandbox.fn(() => receipt),
  };
  const client = new ContractClient({ contract, adapter });
  client.getEventData = sandbox.fn(() => eventData);

  beforeEach(() => sandbox.clear());

  test('estimate', async () => {
    const method = new ContractMethodSender({
      client,
      input,
      functionName,
    });
    sandbox.spyOn(method, '_estimate');
    sandbox.spyOn(ContractMethodSender, 'addSendOptionsDefaults');

    const gasEstimate = new BigNumber(1000);

    method.getMethodArgs = sandbox.fn(() => callArgs);
    method.client.estimate = sandbox.fn(() => gasEstimate);

    expect(await method.estimate(inputValues, options)).toBe(gasEstimate);
    expect(method.getMethodArgs).toHaveBeenCalledWith(inputValues);
    expect(method._estimate).toHaveBeenCalledWith(callArgs, options);
    expect(ContractMethodSender.addSendOptionsDefaults).toHaveBeenCalledWith(
      options,
    );
    expect(method.client.estimate).toHaveBeenCalledWith(
      method.functionName,
      callArgs,
    );
  });

  test('send', async () => {
    const method = new ContractMethodSender({
      client,
      input,
      functionName,
      eventHandlers,
    });

    method.getMethodArgs = sandbox.fn(() => callArgs);
    method.client.send = sandbox.fn(() => transaction);
    method._send = sandbox.fn(() => contractResponse);

    expect(await method.send(inputValues, options)).toEqual(contractResponse);
    expect(method.getMethodArgs).toHaveBeenCalledWith(inputValues);
    expect(method._send).toHaveBeenCalledWith(callArgs, options);
  });

  test('_send', async () => {
    const method = new ContractMethodSender({
      client,
      input,
      functionName,
      eventHandlers,
    });

    method.getMethodArgs = sandbox.fn(() => callArgs);
    method._sendTransaction = sandbox.fn(() => transaction);
    sandbox.spyOn(ContractMethodSender, 'addSendOptionsDefaults');

    expect(await method._send(callArgs, options)).toEqual(contractResponse);
    expect(ContractMethodSender.addSendOptionsDefaults).toHaveBeenCalledWith(
      options,
    );
    expect(method._sendTransaction).toHaveBeenCalledWith(
      callArgs,
      {
        gasPrice: options.gasPrice,
        gasLimit: options.gasLimit,
        nonce: options.nonce,
        value: options.value,
      },
      options.timeoutMs,
    );
    expect(method.client.adapter.getTransactionReceipt).toHaveBeenCalledWith(
      transaction.hash,
    );
    expect(method.client.getEventData).toHaveBeenCalledWith({
      events: method.eventHandlers,
      timeoutMs: options.miningTimeoutMs,
      transactionHash: transaction.hash,
    });
  });
});
