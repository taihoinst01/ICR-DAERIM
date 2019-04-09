/* json structure
 'docType': { 
    'columnSeq': {
        '�»�ܱ���(LU)' : {
            'label(L)': { ���: 0, ����: 0, �ϴ�: 0, ����: 0 },
            'entry(E)': { ���: 0, ����: 0, �ϴ�: 0, ����: 0 }
        },
        '���ϴܱ���(RD)' : {
            'label(L)': { ���: 0, ����: 0, �ϴ�: 0, ����: 0 },
            'entry(E)': { ���: 0, ����: 0, �ϴ�: 0, ����: 0 }
        }
     }
  },
  'default': { // ���ǿ� �����ϴ� ���� ������
        '�»�ܱ���(LU)' : {
            'label(L)': { ���: 0, ����: 0, �ϴ�: 0, ����: 0 },
            'entry(E)': { ���: 0, ����: 0, �ϴ�: 0, ����: 0 }
        },
        '���ϴܱ���(RD)' : {
            'label(L)': { ���: 0, ����: 0, �ϴ�: 0, ����: 0 },
            'entry(E)': { ���: 0, ����: 0, �ϴ�: 0, ����: 0 }
        }
     }
 */

var config = {
    '133': {
        '765': {
            'LU': {
                'L': { up: 0, right: 0, down: 0, left: 0 },
                'E': { up: 0, right: 0, down: 0, left: 0 }
            },
            'RD': {
                'L': { up: 0, right: 0, down: 0, left: 0 },
                'E': { up: 0, right: 0, down: 0, left: 0 }
            }            
        }
    },
    'default': {
        'LU': {
            'L': { up: 0, right: 0, down: 0, left: 0 },
            'E': { up: 0, right: 0, down: 0, left: 0 }
        },
        'RD': {
            'L': { up: 0, right: 0, down: 0, left: 0 },
            'E': { up: 0, right: 0, down: 0, left: 0 }
        }
    }
};


module.exports = config;

