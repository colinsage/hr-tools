var assert = require("assert");
var email = require("../email/email")
describe('Array', function() {
    describe('#indexOf()', function() {
        it('should return -1 when the value is not present', function() {
            assert.equal(-1, [1,2,3].indexOf(5));
            assert.equal(-1, [1,2,3].indexOf(0));
        });
    });
});

describe('Email', function(){
    // it('fun', function () {
    //     assert.equal(false, email.hello());
    // })

    it('send', function () {
        var args = {
            "filePath": "/Users/colin/Documents/test.xlsx",
            "email": "93443011@qq.com",
            "pass": "xutao1983",
            "name": "colin",
            "subject": "gongzitiao",
            "body":""
        }
        email.send(args)
       // clock.tick(7000)
        assert.equal(false, '');
    })

});