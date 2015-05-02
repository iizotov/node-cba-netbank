// Dependencies
var expect = require('chai').expect;
var parser = require('../lib/parser');
var fs = require('fs');
var path = require('path');
var moment = require('moment');

function load(filename) {
	return fs.readFileSync(
		path.resolve(path.resolve(__dirname, 'test_cases'), filename)
	).toString();
}

describe('parser.js', function () {
	var pages = {};

	before(function () {
		//  login page
		pages.login = load('01-login-page.html');
		//  account list page
		pages.accountList = load('02-first-page.html');
		//  transactions page
		pages.transactionList = load('03-transaction-page.html');
		//  transactions page
		pages.transactionPartial = load('04-transaction-partial.txt');
		//	transaction json - case 1
		pages.transactionJson1 = load('transaction-1.json');
		//	transaction json - case 2
		pages.transactionJson2 = load('transaction-2.json');
		//	transaction json - case 3
		pages.transactionJson3 = load('transaction-3.json');
	});

	describe('- parseForm()', function () {
		var formLogin = {};
		var formTransaction = {};

		before(function () {
			parser.parseForm(pages.login, function (error, form) {
				expect(error === null).to.be.true;
				formLogin = form;
			});
			parser.parseForm(pages.transactionList, function (error, form) {
				expect(error === null).to.be.true;
				formTransaction = form;
			});
		});
		it('should be able parse the properties', function () {
			expect(formLogin).to.have.property('RID');
			expect(formLogin).to.have.property('SID');
			expect(formLogin).to.have.property('cid');
			expect(formLogin).to.have.property('rqid');
			expect(formLogin).to.have.property('__VIEWSTATE');
			expect(formLogin).to.have.property('txtMyClientNumber$field');
			expect(formLogin).to.have.property('txtMyPassword$field');
			expect(Object.keys(formLogin).length).to.equal(12);
		});
		it('should parse the value of properties', function () {
			expect(formLogin.RID).to.equal('TsFbWpAhjU6Q6Ub1pWwQEQ');
			expect(formLogin.btnLogon$field).to.equal('LOG ON');
			expect(formLogin.txtMyClientNumber$field).to.equal('');
		});
		it('should parse <input type="radio" ...>', function () {
			expect(formTransaction.ctl00$BodyPlaceHolder$radioSwitchSearchType$field$)
				.to.equal('AllTransactions');
			expect(formTransaction.ctl00$BodyPlaceHolder$radioSwitchDateRange$field$)
				.to.equal('TimePeriod');
		});
		it('should parse <input type="checkbox" ...>', function () {
			expect(formTransaction.ctl00$ContentHeaderPlaceHolder$chkTxnScrolling$field)
				.to.equal('on');
			expect(formTransaction.ctl00$ContentHeaderPlaceHolder$chkMergeCreditDebit$field)
				.to.equal('on');
		});
		it('should parse <select><option ...>...</select>', function () {
			expect(formTransaction.ctl00$ContentHeaderPlaceHolder$ddlAccount$field)
				.to.equal(
					'5218921743830977,MCD,True,True,True,False,True,False,True,False'
				);
			expect(formTransaction.ctl00$BodyPlaceHolder$ddlDateRange$field)
				.to.equal('3');
		});
	});

	describe('- parseAccountList()', function () {
		it('should parse account list', function () {
			parser.parseAccountList(pages.accountList,
				function (error, accounts) {
					expect(error === null).to.be.true;

					expect(accounts.length).to.equal(4);

					expect(accounts[0].nickname).to.equal('Smart Access');
					expect(accounts[0].bsbNumber).to.equal('06 2338');
					expect(accounts[0].accountNumber).to.equal('5282 0634');
					expect(accounts[0].number).to.equal('06233852820634');
					expect(accounts[0].balance).to.equal(23.45);

					expect(accounts[1].nickname).to.equal('NetBank Saver');
					expect(accounts[1].bsbNumber).to.equal('06 2438');
					expect(accounts[1].accountNumber).to.equal('5287 0642');
					expect(accounts[1].number).to.equal('06243852870642');
					expect(accounts[1].balance).to.equal(1234.50);

					expect(accounts[2].nickname).to.equal('GoalSaver');
					expect(accounts[2].bsbNumber).to.equal('06 2860');
					expect(accounts[2].accountNumber).to.equal('1000 6652');
					expect(accounts[2].number).to.equal('06286010006652');
					expect(accounts[2].balance).to.equal(76543.00);

					expect(accounts[3].nickname).to.equal(
						'MasterCard Platinum');
					expect(accounts[3].bsbNumber).to.equal('');
					expect(accounts[3].accountNumber).to.equal(
						'5218 9217 4383 0977');
					expect(accounts[3].number).to.equal('5218921743830977');
					expect(accounts[3].balance).to.equal(-123.45);
				});
		});
	});

	describe('- parseHomePage()', function () {
		it('should parse the submit form and account list', function () {
			parser.parseHomePage(pages.accountList,
				function (error, form, accounts) {
					expect(error === null).to.be.true;

					expect(form).to.have.property('RID');
					expect(form).to.have.property('SID');
					expect(form).to.have.property('__EVENTVALIDATION');
					expect(accounts.length).to.equal(4);
				});
		});
	});

	describe('- parseCurrency()', function () {
		var sampleCurrencies = [{
			text: '$12.34',
			number: 12.34
		}, {
			text: '12.34',
			number: 12.34
		}, {
			text: '$123,456.78',
			number: 123456.78
		}, {
			text: '$123,234.34 CR',
			number: 123234.34
		}, {
			text: '$1,234.56 DR',
			number: -1234.56
		}];

		for (var index in sampleCurrencies) {
			var c = sampleCurrencies[index];
			it('should parse "' + c.text + '"', function () {
				var n = parser.parseCurrency(c.text);
				expect(n).to.equal(c.number);
			});
		}
	});

	describe('- extractTransactionJsonArray()', function () {
		it('should extract transactions JSON array from html', function () {
			var json = parser.extractTransactionJsonArray(pages.transactionList);
			expect(json.length).to.equal(59);
			var t1 = json[0];
			expect(t1.Date.Text).to.equal('27 Apr 2015');
			expect(t1.Description.Text).to.equal(
				'EWAY ELECTRONIC TOLL     HAMMONDVILLE');
			expect(t1.Amount.Text).to.equal('$100.75 DR');
			expect(t1.TranCode.Text).to.equal('00 05');
		});
		it('should parse transactions JSON array from partial callback',
			function () {
				var json = parser.extractTransactionJsonArray(pages
					.transactionPartial);
				expect(json.length).to.equal(40);
				var t1 = json[0];
				expect(t1.Date.Sort[1]).to.equal('201412050743384149731');
				expect(t1.Date.Text).to.equal('05 Dec 2014');
				expect(t1.Description.Text).to.equal(
					'Transfer to xx1060 CommBank app');
				expect(t1.Amount.Text).to.equal('$30.00 DR');
				expect(t1.Balance.Text).to.equal('$25.68 CR');
				expect(t1.TranCode.Text).to.equal('550085');
				expect(t1.ReceiptNumber.Text).to.equal('N120548420145');
			});
		it('should return null if cannot parse the page', function () {
			var json = parser.extractTransactionJsonArray(pages.login);
			expect(json).to.be.null;
		});
	});

	describe('- parseJsonToTransaction()', function () {
		it('should parse JSON to Transaction object - case 1', function () {
			var json = JSON.parse(pages.transactionJson1);
			var t = parser.parseJsonToTransaction(json);

			var date = moment(t.timestamp).utc();
			expect(date.year()).to.equal(2014);
			expect(date.month()).to.equal(10);
			expect(date.date()).to.equal(30);
			expect(date.hours()).to.equal(20);
			expect(date.minutes()).to.equal(26);
			expect(date.seconds()).to.equal(19);
			expect(date.milliseconds()).to.equal(488);

			expect(t.description).to.equal('Credit Interest');
			expect(t.amount).to.equal(0.01);
			expect(t.balance).to.equal(5.68);
			expect(t.trancode).to.equal('700000');
			expect(t.receiptnumber).to.equal('');
		});
		it('should parse JSON to Transaction object - case 2', function () {
			var json = JSON.parse(pages.transactionJson2);
			var t = parser.parseJsonToTransaction(json);

			var date = moment(t.timestamp).utc();
			expect(date.year()).to.equal(2014);
			expect(date.month()).to.equal(10);
			expect(date.date()).to.equal(20);
			expect(date.hours()).to.equal(8);
			expect(date.minutes()).to.equal(16);
			expect(date.seconds()).to.equal(41);
			expect(date.milliseconds()).to.equal(306);

			expect(t.description).to.equal(
				'Transfer to xx1060 CommBank app');
			expect(t.amount).to.equal(-100);
			expect(t.balance).to.equal(20.67);
			expect(t.trancode).to.equal('550085');
			expect(t.receiptnumber).to.equal('N112044272766');
		});
		it('should parse JSON to Transaction object - case 3', function () {
			var json = JSON.parse(pages.transactionJson3);
			var t = parser.parseJsonToTransaction(json);

			var date = moment(t.timestamp).utc();
			expect(date.year()).to.equal(2015);
			expect(date.month()).to.equal(3);
			expect(date.date()).to.equal(25);
			expect(date.hours()).to.equal(0);
			expect(date.minutes()).to.equal(0);
			expect(date.seconds()).to.equal(0);
			expect(date.milliseconds()).to.equal(3);

			expect(t.description).to.equal(
				'DAMS APPLE AT THE STAT   HURSTVILLE');
			expect(t.amount).to.equal(-19.72);
			expect(t.balance).to.equal(0);
			expect(t.trancode).to.equal('00 05');
			expect(t.receiptnumber).to.equal('');
		});
	});

	describe('- parseTransactions()', function () {
		it('should parse a page to transction object array', function () {
			parser.parseTransactions(pages.transactionList, function (error, trans) {
				expect(error).to.be.null;

				expect(trans.length).to.equal(59);
				expect(moment(trans[0].timestamp).utc().year()).to.equal(2015);
				expect(moment(trans[1].timestamp).utc().month()).to.equal(3);
				expect(moment(trans[2].timestamp).utc().date()).to.equal(25);
				expect(moment(trans[3].timestamp).utc().hours()).to.equal(0);
				expect(moment(trans[4].timestamp).utc().minutes()).to.equal(0);
				expect(moment(trans[5].timestamp).utc().seconds()).to.equal(0);
				expect(trans[6].description).to.equal('INTEREST CHARGES');
				expect(trans[7].amount).to.equal(-5.5);
				expect(trans[8].balance).to.equal(0);
				expect(trans[9].trancode).to.equal('00 05');
				expect(trans[10].receiptnumber).to.equal('');
			});
		});
		it('should parse a PARTIAL page to transction object array',
			function () {
				parser.parseTransactions(pages.transactionPartial,
					function (error, trans) {
						expect(error).to.be.null;

						expect(trans.length).to.equal(40);
						expect(moment(trans[0].timestamp).utc().year()).to.equal(2014);
						expect(moment(trans[1].timestamp).utc().month()).to.equal(11);
						expect(moment(trans[2].timestamp).utc().date()).to.equal(3);
						expect(moment(trans[3].timestamp).utc().hours()).to.equal(20);
						expect(moment(trans[4].timestamp).utc().minutes()).to.equal(52);
						expect(moment(trans[5].timestamp).utc().seconds()).to.equal(15);
						expect(trans[6].description).to.equal(
							'Transfer to xx1060 CommBank app');
						expect(trans[7].amount).to.equal(-600);
						expect(trans[8].balance).to.equal(680.67);
						expect(trans[9].trancode).to.equal('550085');
						expect(trans[10].receiptnumber).to.equal('N112744391641');
					});
			});
		it('should raise error if it cannot parse the page', function () {
			parser.parseTransactions(pages.login, function (error, trans) {
				expect(error).not.to.be.null;
			});
		});
	});

	describe('- parseAccountKeys()', function () {
		it('should parse account list with the key of form', function () {
			parser.parseAccountKeys(pages.transactionList,
				function (error, keys) {
					expect(error).to.be.null;

					expect(keys.length).to.equal(4);
					expect(keys[0].nickname).to.equal('Smart Access');
					expect(keys[1].number).to.equal('06243852870642');
					expect(keys[2].key).to.equal(
						'286010006652,DDA,True,False,False,True,True,False,True,False'
					);
					expect(keys[3].key).to.equal(
						'5218921743830977,MCD,True,True,True,False,True,False,True,False'
					);
				});
		});
	});

	describe('- parseTransactionPage()', function () {
		it(
			'should parse the transaction page and get form, transactions and keys',
			function () {
				parser.parseTransactionPage(pages.transactionList,
					function (error, form, transactions, keys) {
						expect(error).to.be.null;

						expect(Object.keys(form).length).to.equal(40);
						expect(transactions.length).to.equal(59);
						expect(keys.length).to.equal(4);
					});
			});
	});
});
