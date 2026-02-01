// SPDX-License-Identifier: GPL-3.0
/*
    Copyright 2021 0KIMS association.

    This file is generated with [snarkJS](https://github.com/iden3/snarkjs).

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity >=0.7.0 <0.9.0;

contract Groth16Verifier {
    // Scalar field size
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax  = 13854759940628348381295691982914233894247128673857334256688123906712894636518;
    uint256 constant alphay  = 700058414462660757401512259693371825858867533602383051101491561390434874757;
    uint256 constant betax1  = 17551525379974206298193098837635880192383784862466676640973419187713634056263;
    uint256 constant betax2  = 7885104400244733291954823375813325051682705744337511123533564480175758081994;
    uint256 constant betay1  = 4638038285655336911671517955901953137067911634440654655799629359504415875836;
    uint256 constant betay2  = 21330169645014337483696239295153739329713837846446427078423760410081033697356;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 6845616946978924301369818573473321303828472355614993055455574219834768230642;
    uint256 constant deltax2 = 21395111488491651758257164317689166082215242667096139762263108196363333326333;
    uint256 constant deltay1 = 757768751875464241782188484133591441652526189815358644492068174930388637298;
    uint256 constant deltay2 = 17938612430439762013022441158919027866903582057290402186716068865543770604438;

    
    uint256 constant IC0x = 11988283175197522273873781409327557970813016800181180492245833012826508725594;
    uint256 constant IC0y = 20886038961401490532040532611467514055423230810586023517450835738011911436357;
    
    uint256 constant IC1x = 2425726571609701742797255247417117233578084497998402060094574090528514878527;
    uint256 constant IC1y = 9997453941368164102874594166672919337142378868255404168301545077852750696682;
    
    uint256 constant IC2x = 14878806516396227267346690535722503655948064433047899202243039604918251169643;
    uint256 constant IC2y = 11124040710417550710103776376641945260445633376965546576659499024868094627553;
    
    uint256 constant IC3x = 16070960563059962638362502850089236588397659667640844552200647260739097017550;
    uint256 constant IC3y = 486741846765187360918034293427735148031917858578959120604988788193401980691;
    
    uint256 constant IC4x = 12449357920110378522009352646639239848216756484668479847036134868131676747242;
    uint256 constant IC4y = 17889404870014498963185549466487027314314977690918519274492642693762029470471;
    
    uint256 constant IC5x = 2789543173390301995853623914010029747870514097465776489739131653020933891885;
    uint256 constant IC5y = 13486386917294316810061259778565532527365758334310645406868647762724933386036;
    
    uint256 constant IC6x = 17780666824422556147319584916173658145341343869646841545570443116377056578988;
    uint256 constant IC6y = 10145887041408858053095421233543185128929691212444877236581541189408364503341;
    
    uint256 constant IC7x = 10985015901640044024134576444151799259157019143952615394288990989615551251049;
    uint256 constant IC7y = 12188217682386527762911299067071442594427403804482361067154500909784602060028;
    
    uint256 constant IC8x = 15220656141505763012881715456104735729297104720128550142610973765184023264459;
    uint256 constant IC8y = 18540183546745376235495184657570164372571993091666317686251877160236002701225;
    
    uint256 constant IC9x = 21054948417483545411578992212510122536304420390529557506209069773519732221082;
    uint256 constant IC9y = 7343369843547333752935084785266092859393813859813855546669264130239963846591;
    
    uint256 constant IC10x = 16698335770078297074973766926856321418715289028885178878949820014146692132562;
    uint256 constant IC10y = 4161528062694775160601375932256833973597804145975522164888049008274421470692;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[10] calldata _pubSignals) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, r)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }
            
            // G1 function to multiply a G1 value(x,y) to value in an address
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pPairing := add(pMem, pPairing)
                let _pVk := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                // Compute the linear combination vk_x
                
                g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))
                
                g1_mulAccC(_pVk, IC2x, IC2y, calldataload(add(pubSignals, 32)))
                
                g1_mulAccC(_pVk, IC3x, IC3y, calldataload(add(pubSignals, 64)))
                
                g1_mulAccC(_pVk, IC4x, IC4y, calldataload(add(pubSignals, 96)))
                
                g1_mulAccC(_pVk, IC5x, IC5y, calldataload(add(pubSignals, 128)))
                
                g1_mulAccC(_pVk, IC6x, IC6y, calldataload(add(pubSignals, 160)))
                
                g1_mulAccC(_pVk, IC7x, IC7y, calldataload(add(pubSignals, 192)))
                
                g1_mulAccC(_pVk, IC8x, IC8y, calldataload(add(pubSignals, 224)))
                
                g1_mulAccC(_pVk, IC9x, IC9y, calldataload(add(pubSignals, 256)))
                
                g1_mulAccC(_pVk, IC10x, IC10y, calldataload(add(pubSignals, 288)))
                

                // -A
                mstore(_pPairing, calldataload(pA))
                mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pPairing, 64), calldataload(pB))
                mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pPairing, 192), alphax)
                mstore(add(_pPairing, 224), alphay)

                // beta2
                mstore(add(_pPairing, 256), betax1)
                mstore(add(_pPairing, 288), betax2)
                mstore(add(_pPairing, 320), betay1)
                mstore(add(_pPairing, 352), betay2)

                // vk_x
                mstore(add(_pPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pPairing, 416), mload(add(pMem, add(pVk, 32))))


                // gamma2
                mstore(add(_pPairing, 448), gammax1)
                mstore(add(_pPairing, 480), gammax2)
                mstore(add(_pPairing, 512), gammay1)
                mstore(add(_pPairing, 544), gammay2)

                // C
                mstore(add(_pPairing, 576), calldataload(pC))
                mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pPairing, 640), deltax1)
                mstore(add(_pPairing, 672), deltax2)
                mstore(add(_pPairing, 704), deltay1)
                mstore(add(_pPairing, 736), deltay2)


                let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)

                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F
            
            checkField(calldataload(add(_pubSignals, 0)))
            
            checkField(calldataload(add(_pubSignals, 32)))
            
            checkField(calldataload(add(_pubSignals, 64)))
            
            checkField(calldataload(add(_pubSignals, 96)))
            
            checkField(calldataload(add(_pubSignals, 128)))
            
            checkField(calldataload(add(_pubSignals, 160)))
            
            checkField(calldataload(add(_pubSignals, 192)))
            
            checkField(calldataload(add(_pubSignals, 224)))
            
            checkField(calldataload(add(_pubSignals, 256)))
            
            checkField(calldataload(add(_pubSignals, 288)))
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
