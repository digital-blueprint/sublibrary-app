import {assert, expect} from 'chai';

import '../src/dbp-sublibrary-shelving';
import '../src/dbp-sublibrary.js';
import {extractEarliestPossibleYearFromPublicationDate} from '../src/utils.js';

suite('dbp-sublibrary-shelving basics', () => {
    let node;

    suiteSetup(async () => {
        node = document.createElement('dbp-sublibrary-shelving');
        document.body.appendChild(node);
        await node.updateComplete;
    });

    suiteTeardown(() => {
        node.remove();
    });

    test('should render', () => {
        assert(node.shadowRoot !== undefined);
    });
});

suite('dbp-sublibrary-app basics', () => {
    let node;

    suiteSetup(async () => {
        node = document.createElement('dbp-app');
        document.body.appendChild(node);
        await node.updateComplete;
    });

    suiteTeardown(() => {
        node.remove();
    });

    test('should render', () => {
        assert(node.shadowRoot !== undefined);
    });
});

suite('extractEarliestPossibleYearFromPublicationDate', () => {
    test('test various things', () => {
        expect(extractEarliestPossibleYearFromPublicationDate('(1980)')).to.equal(1980);
        expect(extractEarliestPossibleYearFromPublicationDate('© 2015 [erschienen 2014]')).to.equal(2014);
        expect(extractEarliestPossibleYearFromPublicationDate('1988 [erschienen] 1989')).to.equal(1988);
        expect(extractEarliestPossibleYearFromPublicationDate('1999')).to.equal(1999);
        expect(extractEarliestPossibleYearFromPublicationDate('1997-')).to.equal(1997);
        expect(extractEarliestPossibleYearFromPublicationDate('[ 2020]')).to.equal(2020);
        expect(extractEarliestPossibleYearFromPublicationDate('[2004]')).to.equal(2004);
        expect(extractEarliestPossibleYearFromPublicationDate('[2004]-')).to.equal(2004);
        expect(extractEarliestPossibleYearFromPublicationDate('1971-2022')).to.equal(1971);
        expect(extractEarliestPossibleYearFromPublicationDate('[1971]-2022')).to.equal(1971);
        expect(extractEarliestPossibleYearFromPublicationDate('1971-[2022]')).to.equal(1971);
        expect(extractEarliestPossibleYearFromPublicationDate('May 2021')).to.equal(2021);
        expect(extractEarliestPossibleYearFromPublicationDate('©2005')).to.equal(2005);
        expect(extractEarliestPossibleYearFromPublicationDate('[20]07')).to.equal(2007);
        expect(extractEarliestPossibleYearFromPublicationDate('[20]07-[20]09')).to.equal(2007);
        expect(extractEarliestPossibleYearFromPublicationDate('[1905-1907]')).to.equal(1905);
        expect(extractEarliestPossibleYearFromPublicationDate('[2nd ed., 1901]')).to.equal(1901);
        expect(extractEarliestPossibleYearFromPublicationDate('[n.d.]')).to.be.null;
        expect(extractEarliestPossibleYearFromPublicationDate('anfangs')).to.be.null;
        expect(extractEarliestPossibleYearFromPublicationDate('')).to.be.null;
    });
});
